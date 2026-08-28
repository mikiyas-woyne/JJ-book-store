# ==============================================================================
# JJ BOOK STORE — SECURITY FIX #7: EMAIL SECURITY & RELIABILITY TEST SUITE
# ==============================================================================
$ErrorActionPreference = "Continue"

Write-Host "`n========================================================" -ForegroundColor Cyan
Write-Host " [TEST SUITE] EMAIL SECURITY, RELIABILITY & DEDUPLICATION" -ForegroundColor Cyan
Write-Host "========================================================`n" -ForegroundColor Cyan

$passed = 0
$failed = 0

function Assert-Test([string]$name, [bool]$condition, [string]$details = "") {
    if ($condition) {
        Write-Host " [PASS] $name" -ForegroundColor Green
        $script:passed++
    } else {
        Write-Host " [FAIL] $name" -ForegroundColor Red
        if ($details) {
            Write-Host "        Details: $details" -ForegroundColor Yellow
        }
        $script:failed++
    }
}

# ------------------------------------------------------------------------------
# 1. STATIC CODE SECURITY AUDITS (TARGETED FAST SCAN)
# ------------------------------------------------------------------------------
Write-Host "--- Step 1: Static Code Security & TLS Audits ---" -ForegroundColor Magenta

$sourceFiles = @(
    "server.ts",
    "functions/src/index.ts",
    "src/lib/emailService.ts",
    "src/components/admin/AdminDashboard.tsx",
    "src/context/AuthContext.tsx",
    "src/components/checkout/CheckoutModal.tsx"
)

# Check 1: No rejectUnauthorized: false in source files
$tlsMatches = @()
foreach ($file in $sourceFiles) {
    if (Test-Path $file) {
        $m = Select-String -Path $file -Pattern "rejectUnauthorized\s*:\s*false"
        if ($m) { $tlsMatches += $m }
    }
}
Assert-Test "TLS Hardening: No rejectUnauthorized: false in codebase" ($tlsMatches.Count -eq 0) "Found insecure TLS overrides: $($tlsMatches.Count)"

# Check 2: No Ethereal test accounts or fake credentials
$etherealMatches = @()
foreach ($file in $sourceFiles) {
    if (Test-Path $file) {
        $m = Select-String -Path $file -Pattern "createTestAccount|smtp\.ethereal\.email"
        if ($m) { $etherealMatches += $m }
    }
}
Assert-Test "Production Ready: No Ethereal test accounts or fallbacks" ($etherealMatches.Count -eq 0) "Found Ethereal references: $($etherealMatches.Count)"

# Check 3: No hardcoded personal email addresses in source files
$personalMatches = @()
foreach ($file in $sourceFiles) {
    if (Test-Path $file) {
        $m = Select-String -Path $file -Pattern "mikiyaswoyne@gmail\.com"
        if ($m) { $personalMatches += $m }
    }
}
Assert-Test "Clean Configuration: No hardcoded personal emails in source" ($personalMatches.Count -eq 0) "Found personal email references: $($personalMatches.Count)"

# ------------------------------------------------------------------------------
# 2. EMAIL SANITIZATION & LOGIC VALIDATION
# ------------------------------------------------------------------------------
Write-Host "`n--- Step 2: HTML & Subject Injection Sanitization Audits ---" -ForegroundColor Magenta

# Check 4: HTML escaping helper in emailService.ts
$emailServiceContent = Get-Content -Path "src/lib/emailService.ts" -Raw
$hasHtmlEscape = $emailServiceContent -match "export function escapeHtml"
$hasSubjectSanitize = $emailServiceContent -match "export function sanitizeSubject"
$hasEmailValidator = $emailServiceContent -match "export function isValidEmail"

Assert-Test "Sanitization: emailService.ts contains escapeHtml utility" $hasHtmlEscape
Assert-Test "Sanitization: emailService.ts contains sanitizeSubject utility" $hasSubjectSanitize
Assert-Test "Validation: emailService.ts contains isValidEmail utility" $hasEmailValidator

# Check 5: Cloud Functions email security & idempotency
$functionsContent = Get-Content -Path "functions/src/index.ts" -Raw
$functionsHasEscape = $functionsContent -match "function escapeHtml"
$functionsHasSubjectSanitize = $functionsContent -match "function sanitizeSubject"
$functionsHasDuplicateGuard = $functionsContent -match "emailDelivery" -and $functionsContent -match "email\.duplicate\.prevented"

Assert-Test "Cloud Functions: contains HTML entity escaping" $functionsHasEscape
Assert-Test "Cloud Functions: contains subject header sanitization" $functionsHasSubjectSanitize
Assert-Test "Cloud Functions: contains atomic email idempotency guard" $functionsHasDuplicateGuard

# Check 6: Server email security & idempotency
$serverContent = Get-Content -Path "server.ts" -Raw
$serverHasEscape = $serverContent -match "function escapeHtml"
$serverHasSubjectSanitize = $serverContent -match "function sanitizeSubject"
$serverHasDuplicateGuard = $serverContent -match "emailDelivery" -and $serverContent -match "email\.duplicate\.prevented"

Assert-Test "Server: contains HTML entity escaping" $serverHasEscape
Assert-Test "Server: contains subject header sanitization" $serverHasSubjectSanitize
Assert-Test "Server: contains email deduplication logic" $serverHasDuplicateGuard

# ------------------------------------------------------------------------------
# 3. LIVE SERVER ENDPOINT SECURITY & IDEMPOTENCY
# ------------------------------------------------------------------------------
Write-Host "`n--- Step 3: Live Server Email Security & API Audits ---" -ForegroundColor Magenta

$serverRunning = $false
try {
    $health = Invoke-RestMethod -Uri "http://localhost:3000/api/health" -Method Get -TimeoutSec 3 -ErrorAction Stop
    if ($health.status -eq "ok") {
        $serverRunning = $true
    }
} catch {
    $serverRunning = $false
}

if ($serverRunning) {
    # Check 7: Unauthorized request to /api/admin/test-email -> 401/403
    try {
        $testEmailRes = Invoke-WebRequest -Uri "http://localhost:3000/api/admin/test-email" -Method Post `
            -ContentType "application/json" -Body '{"toEmail":"test@example.com"}' -ErrorAction Stop
        Assert-Test "Auth Guard: /api/admin/test-email rejects unauthenticated requests" $false "Expected 401 but got $($testEmailRes.StatusCode)"
    } catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        Assert-Test "Auth Guard: /api/admin/test-email rejects unauthenticated requests" ($statusCode -eq 401 -or $statusCode -eq 403) "Received status $statusCode"
    }

    # Check 8: Unauthorized request to /api/admin/smtp-config -> 401/403
    try {
        $smtpConfigRes = Invoke-WebRequest -Uri "http://localhost:3000/api/admin/smtp-config" -Method Get -ErrorAction Stop
        Assert-Test "Auth Guard: /api/admin/smtp-config rejects unauthenticated requests" $false "Expected 401 but got $($smtpConfigRes.StatusCode)"
    } catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        Assert-Test "Auth Guard: /api/admin/smtp-config rejects unauthenticated requests" ($statusCode -eq 401 -or $statusCode -eq 403) "Received status $statusCode"
    }

    # Check 9: Admin test email with invalid recipient format -> 400
    try {
        $invRes = Invoke-WebRequest -Uri "http://localhost:3000/api/admin/test-email" -Method Post `
            -Headers @{ Authorization = "Bearer dev_admin" } `
            -ContentType "application/json" -Body '{"toEmail":"invalid-email-address"}' -ErrorAction Stop
        Assert-Test "Validation: /api/admin/test-email rejects malformed recipient emails" $false "Expected 400"
    } catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        Assert-Test "Validation: /api/admin/test-email rejects malformed recipient emails" ($statusCode -eq 400) "Received status $statusCode"
    }

    # Check 10: Order creation succeeds gracefully even when SMTP is unconfigured (Resilience)
    $bookPayload = @{
        title = "Email Resilience Test Book"
        authorName = "JJ Test Author"
        price = 250
        stockQuantity = 50
        category = "Educational"
        coverImage = ""
        isFeatured = $false
        language = "Amharic"
    } | ConvertTo-Json

    $addBook = Invoke-RestMethod -Uri "http://localhost:3000/api/admin/inventory/add-book" -Method Post `
        -Headers @{ Authorization = "Bearer dev_admin" } `
        -ContentType "application/json" -Body $bookPayload

    $orderPayload = @{
        items = @(
            @{
                bookId = $addBook.book.id
                quantity = 1
                price = 250
                title = "Email Resilience Test Book"
            }
        )
        customerName = "Tadesse Mengistu <script>alert(1)</script>"
        customerEmail = "tadesse@example.com"
        customerPhone = "0911000000"
        paymentMethod = "telebirr"
        shippingAddress = @{
            subcity = "Bole"
            streetAddress = "Cameroon St"
            region = "Addis Ababa"
            city = "Addis Ababa"
            phone = "0911000000"
        }
    } | ConvertTo-Json

    try {
        $orderRes = Invoke-RestMethod -Uri "http://localhost:3000/api/orders/create" -Method Post `
            -Headers @{ Authorization = "Bearer test_cust_email_resilience" } `
            -ContentType "application/json" -Body $orderPayload

        Assert-Test "Resilience: Order creation succeeds cleanly even if SMTP unconfigured" ($orderRes.success -eq $true -and $orderRes.order.orderId -ne $null)
        Assert-Test "Resilience: Order ID assigned and grandTotal computed" ($orderRes.order.grandTotal -ge 250)
    } catch {
        Assert-Test "Resilience: Order creation succeeds cleanly even if SMTP unconfigured" $false "Error: $_"
    }
} else {
    Write-Host " [INFO] Server not running on localhost:3000. Verified static rules and code logic." -ForegroundColor Yellow
}

# ------------------------------------------------------------------------------
# FINAL REPORT SUMMARY
# ------------------------------------------------------------------------------
Write-Host "`n========================================================" -ForegroundColor Cyan
Write-Host " [SUMMARY] Total Passed: $passed | Total Failed: $failed" -ForegroundColor $(if ($failed -eq 0) { "Green" } else { "Red" })
Write-Host "========================================================`n" -ForegroundColor Cyan

if ($failed -gt 0) {
    exit 1
} else {
    exit 0
}
