const path = require('path');
const fs = require('fs');
const { app, BrowserWindow } = require('electron');

const SIZE = 1024;
const OUT_PATH = path.join(__dirname, '..', 'build-resources', 'icon-1024.png');

const html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8" />
<style>
  html, body {
    margin: 0;
    padding: 0;
    width: ${SIZE}px;
    height: ${SIZE}px;
    background: transparent;
  }
  .badge {
    width: ${SIZE}px;
    height: ${SIZE}px;
    border-radius: 225px;
    background: linear-gradient(145deg, #2f7ff2, #1d5fd1);
    display: flex;
    align-items: center;
    justify-content: center;
  }
  svg { display: block; }
</style>
</head>
<body>
  <div class="badge">
    <svg width="560" height="560" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  </div>
</body>
</html>
`;

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: SIZE,
    height: SIZE,
    useContentSize: true,
    frame: false,
    show: false,
    transparent: true,
    backgroundColor: '#00000000',
    webPreferences: { offscreen: false },
  });

  await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
  await new Promise((resolve) => setTimeout(resolve, 200));

  const image = await win.webContents.capturePage();
  fs.writeFileSync(OUT_PATH, image.toPNG());
  console.log(`Wrote ${OUT_PATH}`);

  app.quit();
});
