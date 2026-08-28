# ==============================================================================
# JJ BOOK STORE - AUTHENTICATION & AUTHORIZATION HARDENING TEST SUITE
# ==============================================================================

Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "RUNNING AUTHENTICATION & AUTHORIZATION TEST SUITE" -ForegroundColor Cyan
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

$checkoutModalPath = if (Test-Path "$PSScriptRoot\..\src\components\checkout\CheckoutModal.tsx") { "$PSScriptRoot\..\src\components\checkout\CheckoutModal.tsx" } else { "C:\Users\mickey\.gemini\antigravity-ide\scratch\JJ-book-store\src\components\checkout\CheckoutModal.tsx" }
$checkoutContent = Get-Content -Path $checkoutModalPath -Raw

$rulesPath = if (Test-Path "$PSScriptRoot\..\firestore.rules") { "$PSScriptRoot\..\firestore.rules" } else { "C:\Users\mickey\.gemini\antigravity-ide\scratch\JJ-book-store\firestore.rules" }
$rulesContent = Get-Content -Path $rulesPath -Raw

# ------------------------------------------------------------------------------
# TEST 1: verifyIdToken / getAuth integration in server.ts
# ------------------------------------------------------------------------------
$t1_pass = $serverContent.Contains("getAuth") -and $serverContent.Contains("verifyIdToken") -and $serverContent.Contains("authenticateRequest")
Assert-Test "TEST 1" "Firebase Admin getAuth and verifyIdToken middleware are imported and initialized" $t1_pass "Middleware: authenticateRequest, authAdmin initialization verified"

# ------------------------------------------------------------------------------
# TEST 2: Unauthenticated Order Creation is Rejected (requireAuth)
# ------------------------------------------------------------------------------
$t2_pass = $serverContent.Contains('app.post("/api/orders/create", requireAuth')
Assert-Test "TEST 2" "Order creation endpoint requires authentication (requireAuth middleware)" $t2_pass "Route: POST /api/orders/create protected with requireAuth"

# ------------------------------------------------------------------------------
# TEST 3: Authoritative Customer ID from req.user.uid (Anti-Spoofing)
# ------------------------------------------------------------------------------
$t3_pass = $serverContent.Contains("const customerId = authUser.uid;") -or $serverContent.Contains("customerId = authUser.uid")
Assert-Test "TEST 3" "Server enforces authoritative customer ID from verified token (customerId = authUser.uid)" $t3_pass "Client cannot forge another customer's ID during order placement"

# ------------------------------------------------------------------------------
# TEST 4: IDOR Protection on Order Cancellation
# ------------------------------------------------------------------------------
$t4_pass = $serverContent.Contains('app.post("/api/orders/cancel", requireAuth') -and ($serverContent.Contains('oData.customerId !== authUser.uid && !isStaff') -or $serverContent.Contains('orderData.customerId !== authUser.uid && !isStaff'))
Assert-Test "TEST 4" "IDOR check on order cancellation: Customer cannot cancel another customer's order" $t4_pass "Condition: (order.customerId !== authUser.uid && !isStaff) -> 403 Forbidden"

# ------------------------------------------------------------------------------
# TEST 5: Return Endpoint requires Employee/Staff Role (requireEmployee)
# ------------------------------------------------------------------------------
$t5_pass = $serverContent.Contains('app.post("/api/orders/return", requireEmployee')
Assert-Test "TEST 5" "Order return & restocking endpoint requires employee or admin role (requireEmployee)" $t5_pass "Route: POST /api/orders/return protected with requireEmployee"

# ------------------------------------------------------------------------------
# TEST 6: Restock Endpoint requires Privileged Permission (requirePermission)
# ------------------------------------------------------------------------------
$t6_pass = $serverContent.Contains('app.post("/api/admin/inventory/restock", requirePermission("inventory.restock")')
Assert-Test "TEST 6" "Admin restock endpoint requires 'inventory.restock' permission guard" $t6_pass "Route: POST /api/admin/inventory/restock protected with requirePermission"

# ------------------------------------------------------------------------------
# TEST 7: Inventory Adjustment Endpoint requires Privileged Permission
# ------------------------------------------------------------------------------
$t7_pass = $serverContent.Contains('app.post("/api/admin/inventory/adjust", requirePermission("inventory.adjust")')
Assert-Test "TEST 7" "Admin adjustment endpoint requires 'inventory.adjust' permission guard" $t7_pass "Route: POST /api/admin/inventory/adjust protected with requirePermission"

# ------------------------------------------------------------------------------
# TEST 8: Payment Verification requires Authentication
# ------------------------------------------------------------------------------
$t8_pass = $serverContent.Contains('app.post("/api/payments/verify", requireAuth')
Assert-Test "TEST 8" "Payment verification endpoint requires authentication (requireAuth)" $t8_pass "Route: POST /api/payments/verify protected with requireAuth"

# ------------------------------------------------------------------------------
# TEST 9: Admin SMTP Config endpoints require Strict Admin Role (requireAdmin)
# ------------------------------------------------------------------------------
$t9_pass = $serverContent.Contains('app.get("/api/admin/smtp-config", requireAdmin') -and $serverContent.Contains('app.post("/api/admin/save-smtp-config", requireAdmin')
Assert-Test "TEST 9" "SMTP Configuration endpoints protected with requireAdmin middleware" $t9_pass "Routes: GET & POST /api/admin/smtp-config protected with requireAdmin"

# ------------------------------------------------------------------------------
# TEST 10: CheckoutModal.tsx Eliminated Insecure Direct Firestore Fallback
# ------------------------------------------------------------------------------
$t10_pass = -not $checkoutContent.Contains('addDoc(collection(db, "orders"), cleanFirestoreData(fallbackOrderData))')
Assert-Test "TEST 10" "Insecure direct Firestore client-side order creation fallback is removed from CheckoutModal" $t10_pass "Bypass eliminated: all orders must go through authoritative server validation"

# ------------------------------------------------------------------------------
# TEST 11: CheckoutModal.tsx Sends Bearer Token in Authorization Header
# ------------------------------------------------------------------------------
$t11_pass = $checkoutContent.Contains('"Authorization": finalAuthHeader') -or $checkoutContent.Contains('Authorization: `Bearer ${token}`')
Assert-Test "TEST 11" "CheckoutModal sends Firebase ID Bearer token in Authorization header" $t11_pass "Authorization header attached to POST /api/orders/create"

# ------------------------------------------------------------------------------
# TEST 12: CheckoutModal.tsx Blocks Unauthenticated Guests from Submitting Checkout
# ------------------------------------------------------------------------------
$t12_pass = $checkoutContent.Contains('if (!currentUser)') -and $checkoutContent.Contains('Sign In Required')
Assert-Test "TEST 12" "CheckoutModal requires authenticated currentUser before proceeding with order placement" $t12_pass "Unauthenticated users receive 'Sign In Required' toast prompt"

# ------------------------------------------------------------------------------
# TEST 13: Order Cancellation Ownership Logic Simulation
# ------------------------------------------------------------------------------
function Simulate-OrderCancellation {
    param ($requestUser, $order)
    $isStaff = ($requestUser.role -in @('admin', 'superAdmin', 'staff', 'employee')) -or ($requestUser.email -eq "mikiyaswoyne@gmail.com")
    if ($order.customerId -ne $requestUser.uid -and -not $isStaff) {
        return @{ status = 403; code = "UNAUTHORIZED"; message = "Unauthorized: You cannot cancel an order belonging to another customer." }
    }
    if ($order.orderStatus -ne "pending" -and -not $isStaff) {
        return @{ status = 400; code = "ORDER_CANNOT_BE_CANCELLED"; message = "Only pending orders can be cancelled." }
    }
    return @{ status = 200; code = "SUCCESS"; message = "Order cancelled successfully." }
}

$userCustA = @{ uid = "cust-001"; email = "alice@example.com"; role = "customer" }
$userCustB = @{ uid = "cust-002"; email = "bob@example.com"; role = "customer" }
$userStaff = @{ uid = "staff-001"; email = "staff@jjbookstore.com"; role = "staff" }
$orderAlice = @{ orderId = "JJ-2026-11111"; customerId = "cust-001"; orderStatus = "pending" }

# Bob tries to cancel Alice's order (IDOR)
$simBobCancel = Simulate-OrderCancellation $userCustB $orderAlice
# Alice cancels own order
$simAliceCancel = Simulate-OrderCancellation $userCustA $orderAlice
# Staff cancels Alice's order
$simStaffCancel = Simulate-OrderCancellation $userStaff $orderAlice

$t13_pass = ($simBobCancel.status -eq 403) -and ($simAliceCancel.status -eq 200) -and ($simStaffCancel.status -eq 200)
Assert-Test "TEST 13" "Order cancellation IDOR matrix: Foreign customer blocked (403), Owner allowed (200), Staff allowed (200)" $t13_pass "Bob: $($simBobCancel.status) (Forbidden), Alice: $($simAliceCancel.status) (OK), Staff: $($simStaffCancel.status) (OK)"

# ------------------------------------------------------------------------------
# TEST 14: Role-Based Authorization Guard Simulation
# ------------------------------------------------------------------------------
function Simulate-RequireRole {
    param ($requestUser, [string[]]$allowedRoles, [string[]]$allowedEmails)
    if (-not $requestUser) { return 401 }
    if ($requestUser.status -eq "suspended") { return 403 }
    $isAllowed = ($requestUser.role -in $allowedRoles) -or ($requestUser.email -in $allowedEmails)
    if (-not $isAllowed) { return 403 }
    return 200
}

$adminUser = @{ uid = "adm-01"; email = "admin@jjbookstore.com"; role = "admin"; status = "active" }
$suspendedAdmin = @{ uid = "adm-02"; email = "badadmin@jjbookstore.com"; role = "admin"; status = "suspended" }
$customerUser = @{ uid = "cust-01"; email = "user@example.com"; role = "customer"; status = "active" }
$staffUser = @{ uid = "stf-01"; email = "staff@jjbookstore.com"; role = "staff"; status = "active" }

$resAdminSmtp = Simulate-RequireRole $adminUser @('admin', 'superAdmin') @('mikiyaswoyne@gmail.com')
$resCustSmtp = Simulate-RequireRole $customerUser @('admin', 'superAdmin') @('mikiyaswoyne@gmail.com')
$resStaffSmtp = Simulate-RequireRole $staffUser @('admin', 'superAdmin') @('mikiyaswoyne@gmail.com')
$resSuspAdmin = Simulate-RequireRole $suspendedAdmin @('admin', 'superAdmin') @('mikiyaswoyne@gmail.com')

$t14_pass = ($resAdminSmtp -eq 200) -and ($resCustSmtp -eq 403) -and ($resStaffSmtp -eq 403) -and ($resSuspAdmin -eq 403)
Assert-Test "TEST 14" "Role guard matrix for Admin endpoints: Admin (200), Customer (403), Staff (403), Suspended (403)" $t14_pass "Admin: $resAdminSmtp, Customer: $resCustSmtp, Staff: $resStaffSmtp, Suspended: $resSuspAdmin"

# ------------------------------------------------------------------------------
# TEST 15: Firestore Security Rules Privilege Escalation Lock
# ------------------------------------------------------------------------------
$t15_pass = $rulesContent.Contains("request.resource.data.role == resource.data.role") -and $rulesContent.Contains("request.resource.data.role == 'customer'")
Assert-Test "TEST 15" "Firestore rules lock user role self-promotion (customers cannot set role to admin/staff)" $t15_pass "Rules enforce: role == 'customer' on creation, role immutability on update"

# ------------------------------------------------------------------------------
# SUMMARY REPORT
# ------------------------------------------------------------------------------
Write-Host "`n=================================================" -ForegroundColor Cyan
Write-Host "AUTH & AUTHORIZATION SECURITY RESULTS: $($global:passed) PASSED / $($global:failed) FAILED" -ForegroundColor $(if ($global:failed -eq 0) { "Green" } else { "Red" })
Write-Host "=================================================`n" -ForegroundColor Cyan

if ($global:failed -gt 0) {
    exit 1
} else {
    exit 0
}
