const { spawnSync } = require('node:child_process');
const path = require('node:path');

const projectDir = path.resolve(__dirname, '..');
const nextOutputDir = process.env.MARSAM_NEXT_DIST_DIR || '.next-release-build';
const env = { ...process.env, MARSAM_NEXT_DIST_DIR: nextOutputDir };
const nextCli = path.join(projectDir, 'node_modules', 'next', 'dist', 'bin', 'next');

function runNodeScript(scriptPath, args = []) {
  const result = spawnSync(process.execPath, [scriptPath, ...args], {
    cwd: projectDir,
    env,
    stdio: 'inherit',
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
}

runNodeScript(nextCli, ['build']);
runNodeScript(path.join(projectDir, 'scripts', 'copy-standalone.js'));
