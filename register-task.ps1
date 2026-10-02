$ErrorActionPreference = 'Stop'

$taskName = 'ChatBot - pedidos WhatsApp'
$nodePath = 'C:\Program Files\nodejs\node.exe'
$runnerPath = Join-Path $PSScriptRoot 'run-hidden.vbs'
$wscriptPath = Join-Path $env:WINDIR 'System32\wscript.exe'
$projectPath = (Resolve-Path -LiteralPath $PSScriptRoot).Path

if (-not (Test-Path -LiteralPath $nodePath)) {
    throw "Node.js não encontrado em $nodePath"
}
if (-not (Test-Path -LiteralPath $wscriptPath)) {
    throw "Windows Script Host não encontrado em $wscriptPath"
}

$existing = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
if ($existing) {
    $existingAction = $existing.Actions | Select-Object -First 1
    $knownRunner = $existingAction.Execute -in @($nodePath, $wscriptPath)
    if (-not $knownRunner -or $existingAction.WorkingDirectory -ne $projectPath) {
        throw "Já existe uma tarefa chamada '$taskName' com outro programa."
    }
}

$action = New-ScheduledTaskAction -Execute $wscriptPath -Argument ('"' + $runnerPath + '"') -WorkingDirectory $projectPath
$triggers = @(
    (New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME),
    (New-ScheduledTaskTrigger -Daily -At '08:50')
)
$settings = New-ScheduledTaskSettingsSet -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Seconds 0) -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1) -StartWhenAvailable
$principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel Limited

Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $triggers -Settings $settings -Principal $principal -Description 'Mantém o bot de pedidos do WhatsApp em execução. O envio acontece somente quando ativado no painel.' -Force | Out-Null
Write-Host "Inicialização automática configurada: $taskName"
