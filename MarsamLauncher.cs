using System;
using System.Diagnostics;
using System.IO;
using System.Net.Sockets;
using System.Threading;
using System.Windows.Forms;

namespace MarsamDesktopApp
{
    static class Program
    {
        [STAThread]
        static void Main()
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);

            string baseDir = AppDomain.CurrentDomain.BaseDirectory.TrimEnd('\\');
            string projectPath = baseDir;

            // Search for project root (where package.json exists)
            if (!File.Exists(Path.Combine(projectPath, "package.json")))
            {
                string parentDir = Directory.GetParent(baseDir) != null ? Directory.GetParent(baseDir).FullName : "";
                if (!string.IsNullOrEmpty(parentDir) && File.Exists(Path.Combine(parentDir, "package.json")))
                {
                    projectPath = parentDir;
                }
                else if (File.Exists(@"C:\MarsamApp\package.json"))
                {
                    projectPath = @"C:\MarsamApp";
                }
                else if (File.Exists(@"D:\MarsamApp\package.json"))
                {
                    projectPath = @"D:\MarsamApp";
                }
                else if (File.Exists(@"C:\Users\assa\.gemini\antigravity\scratch\art_studio_system\package.json"))
                {
                    projectPath = @"C:\Users\assa\.gemini\antigravity\scratch\art_studio_system";
                }
            }

            string appUrl = "http://localhost:3000";

            // 1. Verify if background server is active on port 3000
            bool isRunning = IsPortOpen("127.0.0.1", 3000, 400);
            if (!isRunning)
            {
                try
                {
                    ProcessStartInfo srv = new ProcessStartInfo();
                    srv.FileName = "cmd.exe";
                    srv.Arguments = "/c npm run start";
                    srv.WorkingDirectory = projectPath;
                    srv.CreateNoWindow = true;
                    srv.WindowStyle = ProcessWindowStyle.Hidden;
                    srv.UseShellExecute = false;
                    Process.Start(srv);

                    // Wait for server to become responsive
                    for (int i = 0; i < 20; i++)
                    {
                        Thread.Sleep(500);
                        if (IsPortOpen("127.0.0.1", 3000, 300))
                        {
                            break;
                        }
                    }
                }
                catch (Exception ex)
                {
                    MessageBox.Show("تنبيه أثناء بدء الخادم: " + ex.Message, "نظام المرسم", MessageBoxButtons.OK, MessageBoxIcon.Warning);
                }
            }

            // 2. Launch Dedicated Desktop Application Window
            string chromePath = @"C:\Program Files\Google\Chrome\Application\chrome.exe";
            string edgePath = @"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe";

            ProcessStartInfo appWindow = new ProcessStartInfo();
            if (File.Exists(chromePath))
            {
                appWindow.FileName = chromePath;
                appWindow.Arguments = "--app=\"" + appUrl + "\" --window-size=1400,900";
            }
            else if (File.Exists(edgePath))
            {
                appWindow.FileName = edgePath;
                appWindow.Arguments = "--app=\"" + appUrl + "\" --window-size=1400,900";
            }
            else
            {
                appWindow.FileName = appUrl;
                appWindow.UseShellExecute = true;
            }

            try
            {
                Process.Start(appWindow);
            }
            catch (Exception ex)
            {
                MessageBox.Show("خطأ في فتح نافذة التطبيق: " + ex.Message, "نظام المرسم", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }

        static bool IsPortOpen(string host, int port, int timeoutMs)
        {
            try
            {
                using (TcpClient client = new TcpClient())
                {
                    IAsyncResult ar = client.BeginConnect(host, port, null, null);
                    bool success = ar.AsyncWaitHandle.WaitOne(timeoutMs);
                    if (!success) return false;
                    client.EndConnect(ar);
                    return true;
                }
            }
            catch
            {
                return false;
            }
        }
    }
}
