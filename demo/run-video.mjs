import { copyFile, mkdir, readdir } from 'node:fs/promises';
import { spawn, spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const outputDirectory = resolve('demo-output');
const webmOutput = resolve(outputDirectory, 'apresentacao-sistema.webm');
const mp4Output = resolve(outputDirectory, 'apresentacao-sistema.mp4');

function run(command, argumentsList) {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(command, argumentsList, { stdio: 'inherit', shell: process.platform === 'win32' });
    child.on('error', rejectPromise);
    child.on('exit', (code) => code === 0 ? resolvePromise() : rejectPromise(new Error(`${command} terminou com código ${code ?? 'desconhecido'}.`)));
  });
}

async function findVideos(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const paths = await Promise.all(entries.map(async (entry) => {
    const entryPath = resolve(directory, entry.name);
    if (entry.isDirectory()) return findVideos(entryPath);
    return entry.isFile() && entry.name.endsWith('.webm') ? [entryPath] : [];
  }));
  return paths.flat();
}

await mkdir(outputDirectory, { recursive: true });
await run('npx', ['playwright', 'test', 'demo/apresentacao.spec.ts', '--project=apresentacao']);
const videos = await findVideos(resolve(outputDirectory, 'test-results'));
if (videos.length !== 1) throw new Error(`Esperado um único vídeo Playwright, encontrados ${videos.length}.`);
await copyFile(videos[0], webmOutput);
console.log(`Vídeo WebM salvo em ${webmOutput}`);

if (spawnSync('ffmpeg', ['-version'], { stdio: 'ignore' }).status === 0) {
  await run('ffmpeg', ['-y', '-i', webmOutput, '-c:v', 'libx264', '-crf', '18', '-preset', 'slow', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', mp4Output]);
  console.log(`Vídeo MP4 salvo em ${mp4Output}`);
}
