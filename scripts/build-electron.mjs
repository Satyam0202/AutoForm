import esbuild from "esbuild";

const watch = process.argv.includes("--watch");

const shared = {
  bundle: true,
  platform: "node",
  sourcemap: true,
  external: [
    "electron",
    "playwright",
    "playwright-core",
    "chromium-bidi",
    "nodemailer",
  ],
};

const main = await esbuild.context({
  entryPoints: ["src/main/main.ts"],
  outdir: "dist-electron",
  format: "esm",
  ...shared,
});

const preload = await esbuild.context({
  entryPoints: ["src/main/preload.ts"],
  outdir: "dist-electron",
  format: "cjs",
  ...shared,
});

if (watch) {
  await main.watch();
  await preload.watch();
  console.log("⚡ Electron Watching...");
} else {
  await main.rebuild();
  await preload.rebuild();

  await main.dispose();
  await preload.dispose();

  console.log("✅ Electron Build Complete");
}
