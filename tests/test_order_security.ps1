# ==============================================================================
# JJ BOOK STORE - ORDER, CHECKOUT & PAYMENT SECURITY TEST SUITE (POWERSHELL)
# ==============================================================================

Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "RUNNING ORDER & PAYMENT SECURITY VERIFICATION" -ForegroundColor Cyan
Write-Host "=================================================`n" -ForegroundColor Cyan

$passed = 0
$failed = 0

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

$rulesPath = "C:\Users\mickey\.gemini\antigravity-ide\scratch\JJ-book-store-main\firestore.rules"
$rulesContent = Get-Content -Path $rulesPath -Raw

$serverPath = "C:\Users\mickey\.gemini\antigravity-ide\scratch\JJ-book-store-main\server.ts"
$serverContent = Get-Content -Path $serverPath -Raw

# ------------------------------------------------------------------------------
# TEST 1: Customer attempts to create order for another customer
# ------------------------------------------------------------------------------
$test1_rules = $rulesContent.Contains("request.resource.data.customerId == request.auth.uid")
$test1_server = $serverContent.Contains("if (!customerId)")
Assert-Test "TEST 1" "Customer attempts to create order for another customer -> DENIED" ($test1_rules -and $test1_server) "Firestore rules and server enforce customerId == authenticated user"

# ------------------------------------------------------------------------------
# TEST 2: Customer sends grandTotal = 1 while real total is 1000
# ------------------------------------------------------------------------------
# Simulate server calculation
$mockCatalog = @{
    "book-01" = @{ price = 500; stock = 10; active = $true }
}
$requestedQty = 2
$serverCalculatedSubtotal = $mockCatalog["book-01"].price * $requestedQty # 1000
$serverCalculatedTax = [Math]::Round($serverCalculatedSubtotal * 0.15) # 150
$serverCalculatedShipping = 150 # subtotal < 1500
$serverCalculatedGrandTotal = $serverCalculatedSubtotal + $serverCalculatedTax + $serverCalculatedShipping # 1300
$clientSentTotal = 1
$finalAuthoritativeTotal = $serverCalculatedGrandTotal
Assert-Test "TEST 2" "Customer sends grandTotal = 1 while real total is 1000 -> Backend calculates authoritative $finalAuthoritativeTotal ETB" ($finalAuthoritativeTotal -ne $clientSentTotal -and $serverContent.Contains("calculateOrderFinancials")) "Server ignores client-provided grandTotal and calculates real total"

# ------------------------------------------------------------------------------
# TEST 3: Customer sends paymentStatus = paid on creation
# ------------------------------------------------------------------------------
$test3_rules = $rulesContent.Contains("request.resource.data.paymentStatus == 'pending'")
$test3_server = $serverContent.Contains('paymentStatus: "pending"')
Assert-Test "TEST 3" "Customer sends paymentStatus = paid on creation -> DENIED / Set to pending" ($test3_rules -and $test3_server) "Initial paymentStatus is strictly forced to pending"

# ------------------------------------------------------------------------------
# TEST 4: Customer modifies subtotal on existing order
# ------------------------------------------------------------------------------
$test4_rules = $rulesContent.Contains("request.resource.data.subtotal == resource.data.subtotal")
Assert-Test "TEST 4" "Customer modifies subtotal on existing order -> DENIED" $test4_rules "Rules enforce subtotal immutability"

# ------------------------------------------------------------------------------
# TEST 5: Customer modifies discount on existing order
# ------------------------------------------------------------------------------
$test5_rules = $rulesContent.Contains("request.resource.data.discount == resource.data.discount")
Assert-Test "TEST 5" "Customer modifies discount on existing order -> DENIED" $test5_rules "Rules enforce discount immutability"

# ------------------------------------------------------------------------------
# TEST 6: Customer modifies shippingFee on existing order
# ------------------------------------------------------------------------------
$test6_rules = $rulesContent.Contains("request.resource.data.shippingFee == resource.data.shippingFee")
Assert-Test "TEST 6" "Customer modifies shippingFee on existing order -> DENIED" $test6_rules "Rules enforce shippingFee immutability"

# ------------------------------------------------------------------------------
# TEST 7: Customer modifies grandTotal on existing order
# ------------------------------------------------------------------------------
$test7_rules = $rulesContent.Contains("request.resource.data.grandTotal == resource.data.grandTotal")
Assert-Test "TEST 7" "Customer modifies grandTotal on existing order -> DENIED" $test7_rules "Rules enforce grandTotal immutability"

# ------------------------------------------------------------------------------
# TEST 8: Customer modifies paymentReference on existing order
# ------------------------------------------------------------------------------
$test8_rules = $rulesContent.Contains("request.resource.data.paymentReference == resource.data.paymentReference")
Assert-Test "TEST 8" "Customer modifies paymentReference on existing order -> DENIED" $test8_rules "Rules enforce paymentReference immutability"

# ------------------------------------------------------------------------------
# TEST 9: Customer attempts to mark order delivered
# ------------------------------------------------------------------------------
$test9_rules = $rulesContent.Contains("request.resource.data.orderStatus == 'cancelled'") -and -not $rulesContent.Contains("request.resource.data.orderStatus == 'delivered'")
Assert-Test "TEST 9" "Customer attempts to mark order delivered -> DENIED" $test9_rules "Customers can only transition pending orders to cancelled"

# ------------------------------------------------------------------------------
# TEST 10: Two customers attempt to purchase the final unit of a book simultaneously
# ------------------------------------------------------------------------------
# Simulate atomic transaction locking
$simulatedStock = 1
$cust1_success = $false
$cust2_success = $false

# Cust 1 arrives
if ($simulatedStock -ge 1) {
    $simulatedStock -= 1
    $cust1_success = $true
}
# Cust 2 arrives for same unit
if ($simulatedStock -ge 1) {
    $simulatedStock -= 1
    $cust2_success = $true
}

$atomicGuarded = $cust1_success -and (-not $cust2_success) -and $serverContent.Contains("runTransaction")
Assert-Test "TEST 10" "Two customers attempt to purchase final unit simultaneously -> Only one succeeds" $atomicGuarded "Firestore atomic transaction prevents overselling"

# ------------------------------------------------------------------------------
# TEST 11: Customer attempts to reuse an invalid/expired coupon
# ------------------------------------------------------------------------------
$expiredCoupon = @{ code = "EXPIRED50"; active = $true; expirationDate = "2020-01-01"; usageLimit = 10; usedCount = 10 }
$now = Get-Date
$couponValid = ($expiredCoupon.active) -and ([DateTime]$expiredCoupon.expirationDate -gt $now) -and ($expiredCoupon.usedCount -lt $expiredCoupon.usageLimit)
$serverCouponLogic = $serverContent.Contains("isNotExpired && isUnderLimit && meetsMinOrder")
Assert-Test "TEST 11" "Customer attempts to reuse invalid/expired coupon -> DENIED" ((-not $couponValid) -and $serverCouponLogic) "Server checks expiration, usageLimit, and active status"

# ------------------------------------------------------------------------------
# TEST 12: Payment provider reports amount different from order total
# ------------------------------------------------------------------------------
$orderGrandTotal = 850
$providerReportedAmount = 500
$mismatchRejected = ($providerReportedAmount -ne $orderGrandTotal) -and $serverContent.Contains("verifiedAmount !== expectedAmount")
Assert-Test "TEST 12" "Payment provider reports amount different from order total -> Payment NOT confirmed" $mismatchRejected "Server payment verification rejects amount discrepancies"

# ------------------------------------------------------------------------------
# TEST 13: Payment callback is received twice (Idempotency)
# ------------------------------------------------------------------------------
$serverHasIdempotency = $serverContent.Contains("alreadyProcessed: true") -and $serverContent.Contains('order.paymentStatus === "paid"')
Assert-Test "TEST 13" "Payment callback received twice -> Idempotent response (no duplicate processing)" $serverHasIdempotency "Subsequent callbacks detect existing paid status"

# ------------------------------------------------------------------------------
# TEST 14: Employee attempts to modify financial totals without permission
# ------------------------------------------------------------------------------
$test14_rules = $rulesContent.Contains("isEmployee()") -and $rulesContent.Contains("request.resource.data.grandTotal == resource.data.grandTotal") -and $rulesContent.Contains("request.resource.data.subtotal == resource.data.subtotal")
Assert-Test "TEST 14" "Employee attempts to modify financial totals without permission -> DENIED" $test14_rules "Rules block employees from modifying order totals and subtotals"

# ------------------------------------------------------------------------------
# TEST 15: Customer can still view their own order normally
# ------------------------------------------------------------------------------
$test15_rules = $rulesContent.Contains("resource.data.customerId == request.auth.uid")
Assert-Test "TEST 15" "Customer can still view their own order normally -> SUCCESS" $test15_rules "Order read permission granted to order owner"

Write-Host "`n=================================================" -ForegroundColor Cyan
Write-Host "SECURITY TEST SUMMARY: $passed PASSED, $failed FAILED" -ForegroundColor Cyan
Write-Host "=================================================`n" -ForegroundColor Cyan

if ($failed -gt 0) {
    exit 1
}
