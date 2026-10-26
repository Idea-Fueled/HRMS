# Idea-Fueled Biometric Sync Agent (Keka-Free Architecture)

Standalone On-Premises Windows Service that connects directly to the office eSSL / ZKTeco machine (`192.168.10.57:4370`), pulls punch logs directly from the device's flash memory, and pushes them securely to the Idea-Fueled HRMS Cloud API.

---

## Files in this Directory
1. **`config.json`**: Contains IP address, Port, Sync Interval (in minutes), and Cloud API endpoint.
2. **`agent.ps1`**: Lightweight native PowerShell script that connects via `zkemkeeper.ZKEM` COM object (ZKTeco official driver) and posts data.
3. **`install-service.bat`**: Installs and starts the background Windows Service via NSSM with 1 click.
4. **`nssm.exe`**: Non-Sucking Service Manager (can be downloaded or copied into this folder).

---

## 5-Minute Setup Instructions on HR Laptop (via AnyDesk)

1. Create a folder: `C:\IdeaFueled-Biometric-Agent\` on the HR laptop.
2. Copy these 4 files into that folder.
3. Right-click **`install-service.bat`** -> **Run as Administrator**.
4. That's it!
   - The service will appear in `services.msc` as **Idea-Fueled Biometric Attendance Service**.
   - It runs automatically on startup.
   - Logs are written to `service.log`.

---

## Completely Uninstalling Keka
Once the service is verified:
1. Open **Control Panel** -> **Programs and Features**.
2. Select **Keka Attendance Sync Tool** -> **Uninstall**.
3. All done! Keka is 100% removed.
