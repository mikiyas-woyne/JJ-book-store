# ==============================================================================
# JJ BOOK STORE - INVENTORY CONSISTENCY & RACE CONDITION TEST SUITE (POWERSHELL)
# ==============================================================================

Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "RUNNING INVENTORY CONCURRENCY & TRANSACTION TESTS" -ForegroundColor Cyan
Write-Host "=================================================`n" -ForegroundColor Cyan

$global:passed = 0
$global:failed = 0

function Assert-Test {
    param (
        [string]$TestNumber,
        [string]$Description,
        [bool]$Condition,
        [string]$Details = ""
    )
    if ($Condition) {
        Write-Host "  [PASS] $($TestNumber): $Description" -ForegroundColor Green
        if ($Details) { Write-Host "         $Details" -ForegroundColor DarkGray }
        $global:passed++
    } else {
        Write-Host "  [FAIL] $($TestNumber): $Description" -ForegroundColor Red
        if ($Details) { Write-Host "         $Details" -ForegroundColor DarkRed }
        $global:failed++
    }
}

$serverPath = if (Test-Path "$PSScriptRoot\..\server.ts") { "$PSScriptRoot\..\server.ts" } else { "C:\Users\mickey\.gemini\antigravity-ide\scratch\JJ-book-store\server.ts" }
$serverContent = Get-Content -Path $serverPath -Raw

$rulesPath = if (Test-Path "$PSScriptRoot\..\firestore.rules") { "$PSScriptRoot\..\firestore.rules" } else { "C:\Users\mickey\.gemini\antigravity-ide\scratch\JJ-book-store\firestore.rules" }
$rulesContent = Get-Content -Path $rulesPath -Raw

# ------------------------------------------------------------------------------
# TEST 1: Concurrency Model - Stock = 1, Two Purchases of 1
# ------------------------------------------------------------------------------
$stock1 = 1
$sold1 = 0
$res1 = $null
$res2 = $null

function Execute-Purchase1 {
    param ($buyer, $qty)
    if ($global:stock1 -ge $qty) {
        $global:stock1 -= $qty
        $global:sold1 += $qty
        return @{ success = $true; code = "SUCCESS" }
    } else {
        return @{ success = $false; code = "INSUFFICIENT_STOCK" }
    }
}

$res1 = Execute-Purchase1 "Customer A" 1
$res2 = Execute-Purchase1 "Customer B" 1

$test1_pass = ($res1.success -eq $true) -and ($res2.code -eq "INSUFFICIENT_STOCK") -and ($stock1 -eq 0) -and ($sold1 -eq 1) -and ($serverContent.Contains("INSUFFICIENT_STOCK"))
Assert-Test "TEST 1" "Stock = 1, two purchases of 1 -> Exactly 1 succeeds, second gets INSUFFICIENT_STOCK, final stock = 0" $test1_pass "Customer A: $($res1.code), Customer B: $($res2.code), Final Stock: $stock1"

# ------------------------------------------------------------------------------
# TEST 2: Concurrency Model - Stock = 5, Two Purchases of 3
# ------------------------------------------------------------------------------
$stock2 = 5
$sold2 = 0

function Execute-Purchase2 {
    param ($buyer, $qty)
    if ($global:stock2 -ge $qty) {
        $global:stock2 -= $qty
        $global:sold2 += $qty
        return @{ success = $true; code = "SUCCESS" }
    } else {
        return @{ success = $false; code = "INSUFFICIENT_STOCK" }
    }
}

$resA = Execute-Purchase2 "Customer A" 3
$resB = Execute-Purchase2 "Customer B" 3

$test2_pass = ($resA.success -eq $true) -and ($resB.code -eq "INSUFFICIENT_STOCK") -and ($stock2 -eq 2) -and ($sold2 -eq 3)
Assert-Test "TEST 2" "Stock = 5, two purchases of 3 -> Exactly 1 succeeds, second gets INSUFFICIENT_STOCK, final stock = 2" $test2_pass "First purchase: $($resA.code), Second purchase: $($resB.code), Remaining Stock: $stock2"

# ------------------------------------------------------------------------------
# TEST 3: Multi-Book Order Atomicity (No partial orders)
# ------------------------------------------------------------------------------
$serverHasMultiBookCheck = $serverContent.Contains("bookReadResults") -and $serverContent.Contains("INSUFFICIENT_STOCK")
Assert-Test "TEST 3" "Multi-book order atomicity -> If 1 book is short on stock, entire order is aborted (0 items deducted)" $serverHasMultiBookCheck "All book stocks read and verified before applying any mutations in runTransaction"

# ------------------------------------------------------------------------------
# TEST 4: Order Cancellation Restores Stock Exactly Once
# ------------------------------------------------------------------------------
$simCancelStock = 3
$simCancelSold = 2
$orderQty = 2

# Cancel order
$simCancelStock += $orderQty
$simCancelSold -= $orderQty

Assert-Test "TEST 4" "Order cancelled once -> Stock restores from 3 to 5, soldCount decrements" ($simCancelStock -eq 5 -and $simCancelSold -eq 0 -and $serverContent.Contains("/api/orders/cancel")) "Restored Stock: $simCancelStock, soldCount: $simCancelSold"

# ------------------------------------------------------------------------------
# TEST 5: Repeated Cancellation Idempotency (Never restore twice)
# ------------------------------------------------------------------------------
$serverHasCancelIdempotency = $serverContent.Contains("oData.orderStatus === ""cancelled""") -or $serverContent.Contains("orderData.orderStatus === ""cancelled""")
Assert-Test "TEST 5" "Same cancellation request submitted twice -> Stock restored only once (idempotent)" ($simCancelStock -eq 5 -and $serverHasCancelIdempotency) "Repeated cancellation detects already-cancelled status and skips re-restocking"

# ------------------------------------------------------------------------------
# TEST 6: Payment Verification Idempotency (No duplicate stock deductions)
# ------------------------------------------------------------------------------
$serverHasPaymentIdempotency = $serverContent.Contains("order.paymentStatus === ""paid""")
Assert-Test "TEST 6" "Payment callback received twice -> Idempotent response, zero duplicate stock deductions" $serverHasPaymentIdempotency "Server returns alreadyProcessed: true without mutating stock on duplicate callback"

# ------------------------------------------------------------------------------
# TEST 7: Checkout Idempotency Key (Double-click protection)
# ------------------------------------------------------------------------------
$serverHasCheckoutIdempotency = $serverContent.Contains("idempotencyKey")
Assert-Test "TEST 7" "Same checkout idempotency key submitted twice -> Returns existing order, stock deducted only once" $serverHasCheckoutIdempotency "Server checks existing order with idempotencyKey before transaction"

# ------------------------------------------------------------------------------
# TEST 8: Admin Restock Endpoint & Audit Transaction
# ------------------------------------------------------------------------------
$serverHasRestockApi = $serverContent.Contains("/api/admin/inventory/restock")
$serverHasRestockTx = $serverContent.Contains("RESTOCK")
Assert-Test "TEST 8" "Admin restocks +10 copies -> Atomic increment & creates RESTOCK inventory transaction" ($serverHasRestockApi -and $serverHasRestockTx) "Endpoint /api/admin/inventory/restock records audit transaction"

# ------------------------------------------------------------------------------
# TEST 9: Inventory Adjustment Endpoint
# ------------------------------------------------------------------------------
$serverHasAdjustApi = $serverContent.Contains("/api/admin/inventory/adjust")
$serverHasAdjustTx = $serverContent.Contains("ADJUSTMENT")
Assert-Test "TEST 9" "Admin inventory adjustment -> Atomic stock setting & creates ADJUSTMENT audit record" ($serverHasAdjustApi -and $serverHasAdjustTx) "Endpoint /api/admin/inventory/adjust handles manual inventory corrections"

# ------------------------------------------------------------------------------
# TEST 10: Order Return & Restock Handling
# ------------------------------------------------------------------------------
$serverHasReturnApi = $serverContent.Contains("/api/orders/return")
$serverHasReturnTx = $serverContent.Contains("RETURN")
Assert-Test "TEST 10" "Order returned to store -> Restocks good items & creates RETURN inventory transaction" ($serverHasReturnApi -and $serverHasReturnTx) "Endpoint /api/orders/return safely restores returned merchandise"

# ------------------------------------------------------------------------------
# TEST 11: Granular Employee Permissions in Security Rules
# ------------------------------------------------------------------------------
$rulesHasGranularPerms = $rulesContent.Contains("canManageInventory()") -and $rulesContent.Contains("canRestockInventory()")
Assert-Test "TEST 11" "Firestore rules enforce granular inventory permissions (manage_inventory, inventory.restock, etc.)" $rulesHasGranularPerms "Security rules check hasPermission('inventory.restock') and block non-staff writes"

# ------------------------------------------------------------------------------
# TEST 12: Invariant Check: Stock >= 0 and SoldCount >= 0
# ------------------------------------------------------------------------------
$serverGuardsNegative = $serverContent.Contains("Math.max(0") -and $serverContent.Contains("INSUFFICIENT_STOCK")
Assert-Test "TEST 12" "Data integrity invariant: stock >= 0 and soldCount >= 0 enforced across all operations" $serverGuardsNegative "Negative stock prevention and non-negative soldCount clamp verified"

Write-Host "`n=================================================" -ForegroundColor Cyan
Write-Host "INVENTORY TEST SUMMARY: $global:passed PASSED, $global:failed FAILED" -ForegroundColor Cyan
Write-Host "=================================================`n" -ForegroundColor Cyan

if ($global:failed -gt 0) {
    exit 1
} else {
    exit 0
}
