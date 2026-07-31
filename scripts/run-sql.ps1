# Runs a SQL file against the linked Supabase project via the Management API.
# Reads the CLI's access token from Windows Credential Manager; token is never printed.
param(
  [Parameter(Mandatory = $true)][string]$SqlFile,
  [string]$ProjectRef = "xpvytqdzuoxtjftzpnhe"
)

$sig = @"
using System;
using System.Runtime.InteropServices;
public class CredMan {
  [DllImport("advapi32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
  public static extern bool CredRead(string target, int type, int flags, out IntPtr cred);
  [DllImport("advapi32.dll")]
  public static extern void CredFree(IntPtr cred);
  [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
  public struct CREDENTIAL {
    public int Flags; public int Type; public string TargetName; public string Comment;
    public System.Runtime.InteropServices.ComTypes.FILETIME LastWritten;
    public int CredentialBlobSize; public IntPtr CredentialBlob;
    public int Persist; public int AttributeCount; public IntPtr Attributes;
    public string TargetAlias; public string UserName;
  }
}
"@
Add-Type -TypeDefinition $sig

function Get-Cred([string]$target) {
  $ptr = [IntPtr]::Zero
  if (-not [CredMan]::CredRead($target, 1, 0, [ref]$ptr)) { return $null }
  try {
    $cred = [Runtime.InteropServices.Marshal]::PtrToStructure($ptr, [type][CredMan+CREDENTIAL])
    $bytes = New-Object byte[] $cred.CredentialBlobSize
    [Runtime.InteropServices.Marshal]::Copy($cred.CredentialBlob, $bytes, 0, $cred.CredentialBlobSize)
    # go-keyring stores as UTF-8
    return [Text.Encoding]::UTF8.GetString($bytes)
  } finally { [CredMan]::CredFree($ptr) }
}

$token = $null
foreach ($t in @("Supabase CLI:access-token", "supabase:access-token", "Supabase CLI")) {
  $token = Get-Cred $t
  if ($token) { break }
}
if (-not $token) { Write-Error "Supabase access token not found in Credential Manager"; exit 1 }

$sql = Get-Content -Raw $SqlFile
$body = @{ query = $sql } | ConvertTo-Json -Depth 3
try {
  $resp = Invoke-RestMethod -Method Post `
    -Uri "https://api.supabase.com/v1/projects/$ProjectRef/database/query" `
    -Headers @{ Authorization = "Bearer $token" } `
    -ContentType "application/json" -Body $body
  $resp | ConvertTo-Json -Depth 6
} catch {
  Write-Error $_.Exception.Message
  if ($_.ErrorDetails.Message) { Write-Error $_.ErrorDetails.Message }
  exit 1
}
