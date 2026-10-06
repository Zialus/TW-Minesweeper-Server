const { createHash } = require('node:crypto');
const { chmodSync, existsSync, mkdirSync, renameSync, rmSync, writeFileSync } = require('node:fs');
const { homedir, platform, arch } = require('node:os');
const { join, resolve } = require('node:path');
const { execFileSync } = require('node:child_process');

const version = '0.30.6';
const releaseChecksums = {
    'darwin-arm64': '2725a960bc3677c111c6659636e57dfbc899b266064c425d4410de169a681e4e',
    'darwin-x64': '1f862a54ea4067c6ca2b7213769ffc0fd5fa938565dae3d41559a0f408199077',
    'linux-arm64': '4e8389c0ad529b7bcdcfcff7e293f47adaf0e61a09e03186d5164dfd0a29cbe4',
    'linux-ia32': 'c572739c1f315c78a8c44a548594e573ed82fb5be2db3f11401fc139802370be',
    'linux-x64': '179f038a71cd88721738d6c739dd07fbeebc905b48301935f2416e66aead95c6',
    'win32-arm64': '1571455b66b57f54174e14fb6bb5a093d854997326a73c5edeee5461655356c6',
    'win32-ia32': '36952afde350262275b52d337dd6a5a3707e3524fc14fae8457c074e950c6603',
    'win32-x64': '0a496205228971c1fe7d5712ccaaaf47899e5cda373a684d3f51042ed81b57f9',
};

const goOperatingSystems = { darwin: 'darwin', linux: 'linux', win32: 'windows' };
const goArchitectures = { arm64: 'arm64', ia32: 'i386', x64: 'x86_64' };
const platformKey = `${platform()}-${arch()}`;
const checksum = releaseChecksums[platformKey];
const goOS = goOperatingSystems[platform()];
const goArch = goArchitectures[arch()];

if (!checksum || !goOS || !goArch) {
    throw new Error(`Vacuum ${version} does not support ${platformKey}`);
}

const executableName = platform() === 'win32' ? 'vacuum.exe' : 'vacuum';
const cacheDirectory = join(homedir(), '.cache', 'tw-minesweeper-vacuum', version, platformKey);
const vacuumExecutable = join(cacheDirectory, executableName);

async function installVacuum() {
    if (existsSync(vacuumExecutable)) {
        return;
    }

    // Vacuum v0.30.6 publishes Windows executables as tar.gz archives too.
    const archiveName = `vacuum_${version}_${goOS}_${goArch}.tar.gz`;
    const downloadUrl = `https://github.com/daveshanley/vacuum/releases/download/v${version}/${archiveName}`;
    const response = await fetch(downloadUrl);

    if (!response.ok) {
        throw new Error(`Vacuum download failed with HTTP ${response.status}`);
    }

    const archive = Buffer.from(await response.arrayBuffer());
    const actualChecksum = createHash('sha256').update(archive).digest('hex');
    if (actualChecksum !== checksum) {
        throw new Error(`Vacuum checksum mismatch: expected ${checksum}, received ${actualChecksum}`);
    }

    const temporaryDirectory = join(cacheDirectory, `install-${process.pid}`);
    const archivePath = join(temporaryDirectory, archiveName);
    mkdirSync(temporaryDirectory, { recursive: true });
    writeFileSync(archivePath, archive);

    try {
        execFileSync('tar', ['-xzf', archivePath, '-C', temporaryDirectory], { stdio: 'inherit' });
        try {
            renameSync(join(temporaryDirectory, executableName), vacuumExecutable);
        } catch (error) {
            if (!existsSync(vacuumExecutable)) {
                throw error;
            }
        }
        if (platform() !== 'win32') {
            chmodSync(vacuumExecutable, 0o755);
        }
    } finally {
        rmSync(temporaryDirectory, { recursive: true, force: true });
    }
}

async function main() {
    await installVacuum();
    const specPath = resolve(__dirname, '../openapi.yaml');
    execFileSync(vacuumExecutable, ['lint', specPath, '--fail-severity', 'error'], {
        env: { ...process.env, VACUUM_NO_UPDATE_CHECK: 'true' },
        stdio: 'inherit',
    });
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
