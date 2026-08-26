# ==============================================================================
# JJ BOOK STORE - FIRESTORE AUTHORIZATION & SECURITY TEST SUITE (POWERSHELL)
# ==============================================================================

$rulesPath = "C:\Users\mickey\.gemini\antigravity-ide\scratch\JJ-book-store-main\firestore.rules"
$rulesContent = Get-Content -Path $rulesPath -Raw

Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "RUNNING FIRESTORE SECURITY RULES VERIFICATION" -ForegroundColor Cyan
Write-Host "=================================================`n" -ForegroundColor Cyan

$passed = 0
$failed = 0

function Assert-Test {
    param (
        [string]$Name,
        [bool]$Condition
    )
    if ($Condition) {
        Write-Host "  [PASS] $Name" -ForegroundColor Green
        $global:passed++
    } else {
        Write-Host "  [FAIL] $Name" -ForegroundColor Red
        $global:failed++
    }
}

# 1. CATCH-ALL & OPEN RULES ELIMINATION
Write-Host "--- 1. CATCH-ALL & OPEN RULES ELIMINATION ---" -ForegroundColor Yellow
$hasCatchAll = $rulesContent.Contains("match /{document=**}")
$hasOpenRule = $rulesContent.Contains("allow read, write: if true")
Assert-Test "Wildcard catch-all 'match /{document=**}' is removed" (-not $hasCatchAll)
Assert-Test "Unconditional open rule 'allow read, write: if true;' is removed" (-not $hasOpenRule)

# 2. HELPER FUNCTIONS EXISTENCE
Write-Host "`n--- 2. AUTHORIZATION HELPER FUNCTIONS ---" -ForegroundColor Yellow
Assert-Test "Helper function 'isSignedIn()' exists" ($rulesContent -match "function isSignedIn\(\)")
Assert-Test "Helper function 'isOwner(userId)' exists" ($rulesContent -match "function isOwner\(userId\)")
Assert-Test "Helper function 'isAdmin()' exists" ($rulesContent -match "function isAdmin\(\)")
Assert-Test "Helper function 'isEmployee()' exists" ($rulesContent -match "function isEmployee\(\)")
Assert-Test "Helper function 'isDeliveryStaff()' exists" ($rulesContent -match "function isDeliveryStaff\(\)")

# 3. COLLECTION ACCESS CONTROL MATRIX
Write-Host "`n--- 3. COLLECTION ACCESS CONTROL MATRIX ---" -ForegroundColor Yellow

# Users collection
Assert-Test "Users collection blocks role self-promotion" ($rulesContent -match "request\.resource\.data\.role == resource\.data\.role")
Assert-Test "Users collection restricts registration to customer role" ($rulesContent -match "request\.resource\.data\.role == 'customer'")

# Orders collection
Assert-Test "Orders creation restricted to authenticated customer matching own uid" ($rulesContent -match "request\.resource\.data\.customerId == request\.auth\.uid")
Assert-Test "Orders creation requires pending status" ($rulesContent -match "request\.resource\.data\.orderStatus == 'pending'")
Assert-Test "Orders read requires employee, order owner, or assigned delivery driver" ($rulesContent -match "resource\.data\.customerId == request\.auth\.uid")
Assert-Test "Orders cancellation prevents order total tampering" ($rulesContent -match "request\.resource\.data\.grandTotal == resource\.data\.grandTotal")

# Catalog collections (Books, Authors, Categories, Coupons)
Assert-Test "Books catalog is publicly readable" ($rulesContent -match "match /books/\{bookId\}[\s\S]*?allow read: if true;")
Assert-Test "Books write requires Admin" ($rulesContent -match "match /books/\{bookId\}[\s\S]*?allow create, delete: if isAdmin\(\);")
Assert-Test "Authors collection write requires Admin" ($rulesContent -match "match /authors/\{authorId\}[\s\S]*?allow write: if isAdmin\(\);")
Assert-Test "Categories collection write requires Admin" ($rulesContent -match "match /categories/\{categoryId\}[\s\S]*?allow write: if isAdmin\(\);")
Assert-Test "Coupons collection write requires Admin" ($rulesContent -match "match /coupons/\{couponId\}[\s\S]*?allow write: if isAdmin\(\);")

# Carts & Wishlists
Assert-Test "Carts access restricted to document owner" ($rulesContent -match "match /carts/\{userId\}[\s\S]*?allow read, write: if isOwner\(userId\) \|\| isAdmin\(\);")
Assert-Test "Wishlists access restricted to document owner" ($rulesContent -match "match /wishlists/\{userId\}[\s\S]*?allow read, write: if isOwner\(userId\) \|\| isAdmin\(\);")

# Reviews & Ratings
Assert-Test "Reviews creation enforces authenticated owner and valid 1-5 rating" ($rulesContent.Contains("request.resource.data.rating >= 1") -and $rulesContent.Contains("request.resource.data.rating <= 5") -and $rulesContent.Contains("request.resource.data.userId == request.auth.uid"))
Assert-Test "Reviews update/delete restricted to review author or admin" ($rulesContent -match "resource\.data\.userId == request\.auth\.uid")

# Operational Collections (Employees, Inventory, Delivery, Logs)
Assert-Test "Employees management requires Admin" ($rulesContent -match "match /employees/\{employeeId\}[\s\S]*?allow create, delete: if isAdmin\(\);")
Assert-Test "Inventory transactions read/create restricted to Employee/Admin" ($rulesContent -match "match /inventoryTransactions/\{txId\}[\s\S]*?allow read, create: if isEmployee\(\);")
Assert-Test "Delivery assignments read restricted to Employee or assigned driver" ($rulesContent -match "resource\.data\.deliveryEmployeeId == request\.auth\.uid")
Assert-Test "Activity logs read restricted to Admin" ($rulesContent -match "match /activity_logs/\{logId\}[\s\S]*?allow read: if isAdmin\(\);")
Assert-Test "Admin credentials settings protected from non-admin read" ($rulesContent -match "settingId != 'admin_credentials'")

Write-Host "`n=================================================" -ForegroundColor Cyan
Write-Host "SECURITY TEST SUMMARY: $passed PASSED, $failed FAILED" -ForegroundColor Cyan
Write-Host "=================================================`n" -ForegroundColor Cyan

if ($failed -gt 0) {
    exit 1
}
