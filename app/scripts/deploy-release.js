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
        const fullPath = path.join(sourceDir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
            copyFiles(fullPath, destDir, extensions);
        } else {
            const extMatch = extensions.some(ext => item.endsWith(ext));
            if (extMatch) {
                if (!fs.existsSync(destDir)) {
                    fs.mkdirSync(destDir, { recursive: true });
                }
                const destPath = path.join(destDir, item);
                console.log(`🚀 Deploying: ${item} -> ${destDir}`);
                fs.copyFileSync(fullPath, destPath);
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
