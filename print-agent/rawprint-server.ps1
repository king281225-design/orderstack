# Long-running print worker — compiles the raw-print helper ONCE at
# startup (Add-Type / the C# compiler is slow, ~1-3s), then reads one
# print job per line from stdin for as long as this process lives, so
# every job after the first is fast. agent.mjs spawns exactly one of
# these and keeps it running for the whole life of the agent, instead of
# spawning (and recompiling) a fresh one per print request.
#
# Protocol: each stdin line is a JSON object {"printerName":"...","filePath":"..."}.
# Each stdout line is "OK" or "FAILED: <message>".

Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public class RawPrinterHelper {
    [StructLayout(LayoutKind.Sequential, CharSet=CharSet.Unicode)]
    public class DOCINFOA {
        [MarshalAs(UnmanagedType.LPWStr)] public string pDocName;
        [MarshalAs(UnmanagedType.LPWStr)] public string pOutputFile;
        [MarshalAs(UnmanagedType.LPWStr)] public string pDataType;
    }
    [DllImport("winspool.Drv", EntryPoint="OpenPrinterW", SetLastError=true, CharSet=CharSet.Unicode, ExactSpelling=true, CallingConvention=CallingConvention.StdCall)]
    public static extern bool OpenPrinter(string src, out IntPtr hPrinter, IntPtr pd);
    [DllImport("winspool.Drv", EntryPoint="ClosePrinter", SetLastError=true, ExactSpelling=true, CallingConvention=CallingConvention.StdCall)]
    public static extern bool ClosePrinter(IntPtr hPrinter);
    [DllImport("winspool.Drv", EntryPoint="StartDocPrinterW", SetLastError=true, CharSet=CharSet.Unicode, ExactSpelling=true, CallingConvention=CallingConvention.StdCall)]
    public static extern bool StartDocPrinter(IntPtr hPrinter, Int32 level, [In, MarshalAs(UnmanagedType.LPStruct)] DOCINFOA di);
    [DllImport("winspool.Drv", EntryPoint="EndDocPrinter", SetLastError=true, ExactSpelling=true, CallingConvention=CallingConvention.StdCall)]
    public static extern bool EndDocPrinter(IntPtr hPrinter);
    [DllImport("winspool.Drv", EntryPoint="StartPagePrinter", SetLastError=true, ExactSpelling=true, CallingConvention=CallingConvention.StdCall)]
    public static extern bool StartPagePrinter(IntPtr hPrinter);
    [DllImport("winspool.Drv", EntryPoint="EndPagePrinter", SetLastError=true, ExactSpelling=true, CallingConvention=CallingConvention.StdCall)]
    public static extern bool EndPagePrinter(IntPtr hPrinter);
    [DllImport("winspool.Drv", EntryPoint="WritePrinter", SetLastError=true, ExactSpelling=true, CallingConvention=CallingConvention.StdCall)]
    public static extern bool WritePrinter(IntPtr hPrinter, IntPtr pBytes, Int32 dwCount, out Int32 dwWritten);

    public static bool SendBytesToPrinter(string szPrinterName, byte[] data) {
        IntPtr hPrinter;
        DOCINFOA di = new DOCINFOA();
        di.pDocName = "BhojSetu Receipt";
        di.pDataType = "RAW";
        bool ok = OpenPrinter(szPrinterName, out hPrinter, IntPtr.Zero);
        if (!ok) return false;
        ok = StartDocPrinter(hPrinter, 1, di);
        if (!ok) { ClosePrinter(hPrinter); return false; }
        StartPagePrinter(hPrinter);
        IntPtr pUnmanagedBytes = Marshal.AllocCoTaskMem(data.Length);
        Marshal.Copy(data, 0, pUnmanagedBytes, data.Length);
        int written;
        ok = WritePrinter(hPrinter, pUnmanagedBytes, data.Length, out written);
        Marshal.FreeCoTaskMem(pUnmanagedBytes);
        EndPagePrinter(hPrinter);
        EndDocPrinter(hPrinter);
        ClosePrinter(hPrinter);
        return ok;
    }
}
"@

Write-Output "READY"

while ($true) {
    $line = [Console]::In.ReadLine()
    if ($null -eq $line) { break }
    if ($line.Trim().Length -eq 0) { continue }
    try {
        $job = $line | ConvertFrom-Json
        $bytes = [System.IO.File]::ReadAllBytes($job.filePath)
        $ok = [RawPrinterHelper]::SendBytesToPrinter($job.printerName, $bytes)
        if ($ok) { Write-Output "OK" } else { Write-Output "FAILED: SendBytesToPrinter returned false" }
    } catch {
        Write-Output "FAILED: $($_.Exception.Message)"
    }
    [Console]::Out.Flush()
}
