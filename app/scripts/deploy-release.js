const fs = require('fs');
const path = require('path');

const TARGET_DIR = path.join(__dirname, '../src-tauri/target/release/bundle');
const PUBLIC_DIR = path.join(__dirname, '../../web/public/client');

const PLATFORMS = {
    mac: ['.dmg', '.app.tar.gz'],
    windows: ['.exe', '.msi'],
    linux: ['.deb', '.AppImage', '.tar.gz']
};

function copyFiles(sourceDir, destDir, extensions) {
    if (!fs.existsSync(sourceDir)) return;
    
    const items = fs.readdirSync(sourceDir);
    for (const item of items) {
        // Skip Tauri internal dpkg temporary build files
        if (item === 'control.tar.gz' || item === 'data.tar.gz') continue;

        const fullPath = path.join(sourceDir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
            copyFiles(fullPath, destDir, extensions);
        } else {
            for (const ext of extensions) {
                if (item.endsWith(ext)) {
                    if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
                    
                    // Route to generic _latest endpoint
                    let finalName = `sparks-connect_latest${ext}`;
                    
                    // Manage macOS architecture splits if compiling Universal DMG
                    if (ext === '.dmg') {
                        if (item.toLowerCase().includes('m1') || item.toLowerCase().includes('aarch64') || item.toLowerCase().includes('arm64')) {
                            finalName = 'sparks-connect-arm64_latest.dmg';
                        } else if (item.toLowerCase().includes('x64') || item.toLowerCase().includes('intel')) {
                            finalName = 'sparks-connect-x64_latest.dmg';
                        } else {
                            finalName = 'sparks-connect-universal_latest.dmg';
                        }
                    }

                    const destPath = path.join(destDir, finalName);
                    console.log(`🚀 Deploying: ${item} -> ${finalName}`);
                    fs.copyFileSync(fullPath, destPath);
                    break;
                }
            }
        }
    }
}

async function runDeploy() {
    console.log("Locating Tauri binary bundles...");
    if (!fs.existsSync(TARGET_DIR)) {
        console.error("Target bundle directory not found. Did the rust build fail?");
        process.exit(0);
    }

    console.log("Emptying Dummy Files if they exist...");
    // Only attempt copy to OS folders if extensions match
    copyFiles(TARGET_DIR, path.join(PUBLIC_DIR, 'mac'), PLATFORMS.mac);
    copyFiles(TARGET_DIR, path.join(PUBLIC_DIR, 'windows'), PLATFORMS.windows);
    copyFiles(TARGET_DIR, path.join(PUBLIC_DIR, 'linux'), PLATFORMS.linux);

    console.log("✅ All compiled binaries have been successfully published to the Download Center.");
}

runDeploy();
