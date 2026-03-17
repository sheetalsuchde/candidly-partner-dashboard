// Candidly Partner Dashboard – Figma Plugin
// Recreates the full dashboard as editable Figma layers.

figma.showUI(__html__, { width: 400, height: 200 });

figma.ui.onmessage = async (msg) => {
  if (msg.type === 'create') {
    try {
      await buildDashboard();
      figma.closePlugin('✅ Candidly Dashboard created!');
    } catch (err) {
      console.error(err);
      figma.closePlugin('❌ Error: ' + (err.message || String(err)));
    }
  } else {
    figma.closePlugin();
  }
};

// ─── Color palette ────────────────────────────────────────────────────────────
const C = {
  white:       { r: 1,     g: 1,     b: 1     },
  black:       { r: 0.051, g: 0.051, b: 0.051 },
  blue:        { r: 0.149, g: 0.365, b: 0.863 }, // #265DDC
  lightBlue:   { r: 0.933, g: 0.945, b: 1     }, // #EEF1FF
  grey50:      { r: 0.957, g: 0.965, b: 0.976 }, // #F4F6F9
  grey100:     { r: 0.918, g: 0.925, b: 0.937 }, // #EAECEf
  grey200:     { r: 0.863, g: 0.875, b: 0.894 }, // #DCE0E4
  grey400:     { r: 0.667, g: 0.694, b: 0.737 }, // #AAB1BC
  grey600:     { r: 0.420, g: 0.451, b: 0.502 }, // #6B7380
  grey900:     { r: 0.118, g: 0.129, b: 0.157 }, // #1E2128
  green:       { r: 0.204, g: 0.659, b: 0.325 }, // #34A853
  amber:       { r: 1,     g: 0.976, b: 0.922 }, // alert bg
  amberBorder: { r: 0.984, g: 0.750, b: 0.141 }, // #FBBF24
  amberIcon:   { r: 0.961, g: 0.620, b: 0.043 }, // #F59E0B
  blueText:    { r: 0.165, g: 0.290, b: 0.478 }, // #2A4A7A
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fills(color, opacity = 1) {
  return [{ type: 'SOLID', color, opacity }];
}
function noFill() { return []; }

async function loadFonts() {
  for (const style of ['Regular', 'Medium', 'SemiBold', 'Bold']) {
    await figma.loadFontAsync({ family: 'Inter', style });
  }
}

// Create a plain frame (absolute-positioned children)
function mkFrame(name, w, h, bg) {
  const f = figma.createFrame();
  f.name = name;
  f.resize(w, h);
  f.fills = bg ? fills(bg) : noFill();
  f.clipsContent = false;
  return f;
}

// Create an auto-layout frame
function mkAuto(name, dir, opts = {}) {
  const f = figma.createFrame();
  f.name = name;
  f.layoutMode = dir;
  f.fills = opts.bg ? fills(opts.bg, opts.bgOpacity ?? 1) : noFill();
  f.itemSpacing       = opts.gap  ?? 0;
  f.paddingLeft       = opts.pl   ?? opts.px ?? opts.p ?? 0;
  f.paddingRight      = opts.pr   ?? opts.px ?? opts.p ?? 0;
  f.paddingTop        = opts.pt   ?? opts.py ?? opts.p ?? 0;
  f.paddingBottom     = opts.pb   ?? opts.py ?? opts.p ?? 0;
  f.primaryAxisSizingMode   = opts.primary   ?? 'AUTO';
  f.counterAxisSizingMode   = opts.counter   ?? 'AUTO';
  f.primaryAxisAlignItems   = opts.mainAlign ?? 'MIN';
  f.counterAxisAlignItems   = opts.crossAlign ?? 'MIN';
  if (opts.w && opts.h) f.resize(opts.w, opts.h);
  if (opts.radius) f.cornerRadius = opts.radius;
  if (opts.stroke) {
    f.strokes      = [{ type: 'SOLID', color: opts.stroke }];
    f.strokeWeight = opts.strokeW ?? 1;
    f.strokeAlign  = 'INSIDE';
  }
  f.clipsContent = opts.clip ?? false;
  return f;
}

// Create a rectangle
function mkRect(name, w, h, opts = {}) {
  const r = figma.createRectangle();
  r.name   = name;
  r.resize(w, h);
  r.fills  = opts.bg ? fills(opts.bg) : noFill();
  if (opts.radius)  r.cornerRadius = opts.radius;
  if (opts.stroke) {
    r.strokes      = [{ type: 'SOLID', color: opts.stroke }];
    r.strokeWeight = opts.strokeW ?? 1;
    r.strokeAlign  = opts.strokeAlign ?? 'INSIDE';
  }
  return r;
}

// Create an ellipse
function mkCircle(name, d, bg) {
  const e = figma.createEllipse();
  e.name  = name;
  e.resize(d, d);
  e.fills = fills(bg);
  return e;
}

// Create a text node
function mkText(name, chars, opts = {}) {
  const t = figma.createText();
  t.name     = name;
  t.fontName = { family: 'Inter', style: opts.weight ?? 'Regular' };
  t.characters = chars;
  t.fontSize = opts.size ?? 14;
  t.fills    = fills(opts.color ?? C.grey900, opts.opacity ?? 1);
  if (opts.wrap) {
    t.textAutoResize = 'HEIGHT';
    if (opts.maxW) t.resize(opts.maxW, 20);
  }
  return t;
}

// Bottom-only stroke helper
function strokeBottom(node, color, w = 1) {
  node.strokes      = [{ type: 'SOLID', color }];
  node.strokeWeight = w;
  node.strokeAlign  = 'OUTSIDE';
  try {
    node.strokeTopWeight    = 0;
    node.strokeRightWeight  = 0;
    node.strokeBottomWeight = w;
    node.strokeLeftWeight   = 0;
  } catch (_) {
    // Fallback for older plugin API versions
  }
}

// ─── Build the dashboard ──────────────────────────────────────────────────────
async function buildDashboard() {
  await loadFonts();

  // ── Root frame ──────────────────────────────────────────────────────────────
  const root = mkAuto('Candidly Partner Dashboard', 'VERTICAL', {
    bg: C.grey50, gap: 0,
    primary: 'AUTO', counter: 'FIXED',
  });
  root.resize(1280, 1);

  // ══ HEADER ══════════════════════════════════════════════════════════════════
  const header = mkAuto('Header', 'HORIZONTAL', {
    bg: C.white,
    px: 72, py: 16, gap: 0,
    primary: 'FIXED', counter: 'AUTO',
    mainAlign: 'SPACE_BETWEEN', crossAlign: 'CENTER',
    w: 1280,
  });
  strokeBottom(header, C.grey200);

  // Menu (left)
  const menu = mkAuto('Menu', 'HORIZONTAL', { gap: 8, crossAlign: 'CENTER' });
  const menuIcon = mkRect('≡ Bars', 20, 14, { bg: C.grey900, radius: 2 });
  const menuLbl  = mkText('Menu', 'Menu', { size: 14, weight: 'Medium', color: C.grey900 });
  menu.appendChild(menuIcon);
  menu.appendChild(menuLbl);

  // Logo (center)
  const logo = mkText('Logo', 'candidly', { size: 18, weight: 'Bold', color: C.blue });

  // Right icons
  const iconsRight = mkAuto('Nav Icons', 'HORIZONTAL', { gap: 16, crossAlign: 'CENTER' });
  const bellIcon = mkRect('Bell', 22, 24, { radius: 4, stroke: C.grey400, strokeW: 1.5 });
  const userIcon = mkCircle('User', 28, C.grey200);
  iconsRight.appendChild(bellIcon);
  iconsRight.appendChild(userIcon);

  header.appendChild(menu);
  header.appendChild(logo);
  header.appendChild(iconsRight);
  root.appendChild(header);

  // ══ PAGE CONTENT ════════════════════════════════════════════════════════════
  const page = mkAuto('Page Content', 'VERTICAL', {
    bg: C.grey50,
    px: 72, pt: 32, pb: 40, gap: 24,
    primary: 'AUTO', counter: 'FIXED',
    w: 1280,
  });

  // ── ALERT BANNER ────────────────────────────────────────────────────────────
  const alert = mkAuto('Alert Banner', 'HORIZONTAL', {
    bg: C.amber,
    px: 20, py: 16, gap: 16,
    primary: 'FIXED', counter: 'AUTO',
    mainAlign: 'SPACE_BETWEEN', crossAlign: 'CENTER',
    radius: 12,
    stroke: C.amberBorder,
    w: 1136,
  });

  // Alert left: icon + text
  const alertLeft = mkAuto('Alert Left', 'HORIZONTAL', { gap: 12, crossAlign: 'MIN' });
  const warnIcon  = mkRect('⚠ Icon', 20, 20, { bg: C.amberIcon, radius: 4 });

  const alertTextCol = mkAuto('Alert Text', 'VERTICAL', {
    gap: 6, primary: 'AUTO', counter: 'AUTO',
  });
  const alertTitle = mkText('Alert Title',
    'The federal government has resumed involuntary collections on defaulted student loans',
    { size: 14, weight: 'SemiBold', color: C.grey900, wrap: true, maxW: 580 });
  const alertBody = mkText('Alert Body',
    "If you're behind on payments, it's important to take steps to avoid default — or get out of default if you're already in it to avoid collections. Please visit our defaulted loan resource hub to understand your options and receive step-by-step guidance.",
    { size: 14, weight: 'Regular', color: C.grey600, wrap: true, maxW: 580 });

  alertTextCol.appendChild(alertTitle);
  alertTextCol.appendChild(alertBody);
  alertLeft.appendChild(warnIcon);
  alertLeft.appendChild(alertTextCol);

  // Alert right: button + close
  const alertRight = mkAuto('Alert Actions', 'HORIZONTAL', { gap: 12, crossAlign: 'CENTER' });

  const exploreBtn = mkAuto('Explore Btn', 'HORIZONTAL', {
    px: 16, py: 8,
    primary: 'AUTO', counter: 'AUTO',
    mainAlign: 'CENTER', crossAlign: 'CENTER',
    radius: 20,
    stroke: C.grey900,
  });
  const exploreTxt = mkText('Btn Text', 'Explore default resources',
    { size: 13, weight: 'Medium', color: C.grey900 });
  exploreBtn.appendChild(exploreTxt);

  const closeBtn = mkRect('✕ Close', 20, 20, { bg: C.grey600, radius: 2 });

  alertRight.appendChild(exploreBtn);
  alertRight.appendChild(closeBtn);
  alert.appendChild(alertLeft);
  alert.appendChild(alertRight);
  page.appendChild(alert);

  // ── DASHBOARD CARD ──────────────────────────────────────────────────────────
  const card = mkAuto('Dashboard Card', 'VERTICAL', {
    bg: C.white,
    px: 32, pt: 0, pb: 32, gap: 0,
    primary: 'AUTO', counter: 'FIXED',
    radius: 16, w: 1136,
  });

  // Tab bar
  const tabBar = mkAuto('Tab Bar', 'HORIZONTAL', {
    primary: 'FIXED', counter: 'AUTO',
    mainAlign: 'SPACE_BETWEEN', crossAlign: 'CENTER',
    w: 1072,
  });
  strokeBottom(tabBar, C.grey200);

  function mkTab(label, active) {
    const tab = mkAuto(label, 'HORIZONTAL', {
      px: 4, py: 14,
      primary: 'AUTO', counter: 'AUTO',
      mainAlign: 'CENTER', crossAlign: 'CENTER',
    });
    const t = mkText(label, label, {
      size: 16,
      weight: active ? 'Medium' : 'Regular',
      color: active ? C.blue : C.grey600,
    });
    tab.appendChild(t);
    if (active) strokeBottom(tab, C.blue, 2);
    return tab;
  }

  const leftTabs = mkAuto('Left Tabs', 'HORIZONTAL', { gap: 24 });
  leftTabs.appendChild(mkTab('Pay down my student debt faster', true));
  leftTabs.appendChild(mkTab('Lower my monthly payment', false));

  const rightTabs = mkAuto('Right Tabs', 'HORIZONTAL', { gap: 20 });
  rightTabs.appendChild(mkTab('My Goal', true));
  rightTabs.appendChild(mkTab('My Plan', false));

  tabBar.appendChild(leftTabs);
  tabBar.appendChild(rightTabs);
  card.appendChild(tabBar);

  // Action row
  const actionRow = mkAuto('Action Row', 'HORIZONTAL', {
    pt: 16, pb: 0,
    primary: 'FIXED', counter: 'AUTO',
    mainAlign: 'SPACE_BETWEEN', crossAlign: 'CENTER',
    w: 1072,
  });

  const editBtn = mkAuto('Edit Loan Data', 'HORIZONTAL', {
    px: 12, py: 6, gap: 4,
    primary: 'AUTO', counter: 'AUTO',
    crossAlign: 'CENTER',
    radius: 20, stroke: C.grey200,
  });
  editBtn.appendChild(mkText('Edit', 'Edit Loan Data', { size: 13, color: C.grey900 }));
  editBtn.appendChild(mkText('›', '›', { size: 16, color: C.grey600 }));

  const secBadge = mkAuto('Security Badge', 'HORIZONTAL', { gap: 6, crossAlign: 'CENTER' });
  const checkIcon = mkCircle('Check', 16, { r: 0.95, g: 0.97, b: 1 });
  checkIcon.strokes      = [{ type: 'SOLID', color: C.blue }];
  checkIcon.strokeWeight = 1.5;
  checkIcon.strokeAlign  = 'INSIDE';
  secBadge.appendChild(checkIcon);
  secBadge.appendChild(mkText('Sec1', 'Your data is protected by our ', { size: 13, color: C.grey600 }));
  secBadge.appendChild(mkText('Sec2', 'security policy ↗', { size: 13, weight: 'Medium', color: C.blue }));

  actionRow.appendChild(editBtn);
  actionRow.appendChild(secBadge);
  card.appendChild(actionRow);

  // ── MAIN CONTENT ROW ────────────────────────────────────────────────────────
  const mainRow = mkAuto('Main Content', 'HORIZONTAL', {
    pt: 24, gap: 32,
    primary: 'FIXED', counter: 'AUTO',
    w: 1072,
  });

  // ── CHART PANEL (left) ──────────────────────────────────────────────────────
  const chartPanel = mkAuto('Chart Panel', 'VERTICAL', {
    gap: 20,
    primary: 'AUTO', counter: 'FIXED',
    w: 680,
  });

  // Goal card (blue)
  const goalCard = mkAuto('Goal Card', 'VERTICAL', {
    bg: C.blue,
    p: 24, gap: 4,
    primary: 'AUTO', counter: 'AUTO',
    radius: 10,
  });
  const goalLbl = mkText('Goal Label', 'Your Goal: Save',
    { size: 16, weight: 'Regular', color: C.white, opacity: 0.7 });
  goalLbl.fills = fills(C.white, 0.7);
  goalCard.appendChild(goalLbl);
  goalCard.appendChild(mkText('Goal Value', '2.1 Years',
    { size: 28, weight: 'Bold', color: C.white }));
  chartPanel.appendChild(goalCard);

  // Slider
  const sliderRow = mkAuto('Slider', 'HORIZONTAL', {
    gap: 0, crossAlign: 'CENTER',
    primary: 'FIXED', counter: 'AUTO',
    w: 600,
  });
  const sliderFilled = mkRect('Filled Track', 200, 6, { bg: C.blue, radius: 3 });
  const sliderHandle = mkCircle('Handle', 18, C.white);
  sliderHandle.strokes      = [{ type: 'SOLID', color: C.blue }];
  sliderHandle.strokeWeight = 2;
  sliderHandle.strokeAlign  = 'INSIDE';
  const sliderEmpty  = mkRect('Empty Track',  400, 6, { bg: C.grey200, radius: 3 });
  sliderRow.appendChild(sliderFilled);
  sliderRow.appendChild(sliderEmpty);
  chartPanel.appendChild(sliderRow);

  // Chart area – absolute positioned children
  const chartArea = mkFrame('Chart Area', 600, 280);

  // Grid lines (5 dotted)
  const dotYs = [40, 80, 120, 160, 200];
  for (let i = 0; i < dotYs.length; i++) {
    const gl = figma.createLine();
    gl.name         = `Grid Line ${i + 1}`;
    gl.x            = 0;
    gl.y            = dotYs[i];
    gl.resize(560, 0);
    gl.strokes      = [{ type: 'SOLID', color: C.grey200 }];
    gl.strokeWeight = 1;
    gl.dashPattern  = [4, 4];
    chartArea.appendChild(gl);
  }

  // Solid black baseline
  const baseline = figma.createLine();
  baseline.name         = 'Baseline';
  baseline.x            = 0;
  baseline.y            = 232;
  baseline.resize(560, 0);
  baseline.strokes      = [{ type: 'SOLID', color: C.black }];
  baseline.strokeWeight = 1.5;
  chartArea.appendChild(baseline);

  // Grey line – original payoff (60,50) → (420,232)
  const greyLine = figma.createVector();
  greyLine.name        = 'Original Payoff Line';
  greyLine.vectorPaths = [{ windingRule: 'NONE', data: 'M 60 50 L 420 232' }];
  greyLine.fills       = noFill();
  greyLine.strokes     = [{ type: 'SOLID', color: C.grey400 }];
  greyLine.strokeWeight = 2;
  greyLine.strokeCap    = 'ROUND';
  chartArea.appendChild(greyLine);

  // Green dashed line – with goal (60,50) → (290,232)
  const greenLine = figma.createVector();
  greenLine.name        = 'Goal Payoff Line';
  greenLine.vectorPaths = [{ windingRule: 'NONE', data: 'M 60 50 L 290 232' }];
  greenLine.fills       = noFill();
  greenLine.strokes     = [{ type: 'SOLID', color: C.green }];
  greenLine.strokeWeight = 2;
  greenLine.strokeCap    = 'ROUND';
  greenLine.dashPattern  = [6, 4];
  chartArea.appendChild(greenLine);

  // Green checkmark marker at end of green line (290, 232)
  const greenDot = mkCircle('● Green Marker', 16, C.green);
  greenDot.x = 282;  // center offset: 290 - 8
  greenDot.y = 224;  // center offset: 232 - 8
  chartArea.appendChild(greenDot);

  // Checkmark inside green dot
  const checkmark = figma.createVector();
  checkmark.name = '✓';
  checkmark.vectorPaths = [{ windingRule: 'NONE', data: 'M 284.5 232 L 287 234.5 L 291.5 229' }];
  checkmark.fills       = noFill();
  checkmark.strokes     = [{ type: 'SOLID', color: C.white }];
  checkmark.strokeWeight = 1.6;
  checkmark.strokeCap    = 'ROUND';
  checkmark.strokeJoin   = 'ROUND';
  chartArea.appendChild(checkmark);

  // Grey dot marker at end of grey line (420, 232)
  const greyDot = mkCircle('● Grey Marker', 16, C.grey400);
  greyDot.x = 412;
  greyDot.y = 224;
  chartArea.appendChild(greyDot);

  // X-axis year labels
  const years     = ['2025', '2026', '2027', '2028', '2029', '2030', '2031', '2032'];
  const yearXs    = [20, 90, 160, 230, 300, 370, 440, 510];
  for (let i = 0; i < years.length; i++) {
    const lbl = mkText(years[i], years[i], { size: 11, color: C.grey400 });
    lbl.x = yearXs[i];
    lbl.y = 244;
    chartArea.appendChild(lbl);
  }

  chartPanel.appendChild(chartArea);
  mainRow.appendChild(chartPanel);

  // ── INFO PANEL (right) ──────────────────────────────────────────────────────
  const infoPanel = mkAuto('Info Panel', 'VERTICAL', {
    bg: C.lightBlue,
    p: 24, gap: 20,
    primary: 'FIXED', counter: 'FIXED',
    radius: 12, w: 320, h: 480,
  });

  // Target icon
  const targetBg = mkCircle('Target Icon', 48, { r: 0.78, g: 0.84, b: 0.98 });
  infoPanel.appendChild(targetBg);

  // Savings card (white)
  const savingsCard = mkAuto('Savings Card', 'VERTICAL', {
    bg: C.white,
    px: 16, py: 16, gap: 6,
    primary: 'AUTO', counter: 'FIXED',
    radius: 10, w: 272,
  });
  savingsCard.appendChild(mkText('Savings Label', "Money you'd save",
    { size: 16, color: C.blueText }));
  savingsCard.appendChild(mkText('Savings Amount', '$3,630',
    { size: 32, weight: 'Bold', color: C.grey900 }));
  infoPanel.appendChild(savingsCard);

  // Info description
  const infoText = mkText('Info Description',
    'You will pay off your loan 2.1 years sooner by paying an extra $28 per month.',
    { size: 14, color: C.grey600, wrap: true, maxW: 272 });
  infoPanel.appendChild(infoText);

  // Divider
  const divider = mkRect('Divider', 272, 1, { bg: C.grey200 });
  infoPanel.appendChild(divider);

  // Extra savings row (monthly amount chip)
  const extraRow = mkAuto('Extra Per Month', 'HORIZONTAL', {
    gap: 8, crossAlign: 'CENTER',
    primary: 'AUTO', counter: 'AUTO',
  });
  const chipBg = mkAuto('Chip', 'HORIZONTAL', {
    bg: C.blue,
    px: 10, py: 4,
    primary: 'AUTO', counter: 'AUTO',
    radius: 12,
  });
  chipBg.appendChild(mkText('Chip Value', '$28/mo', { size: 12, weight: 'Medium', color: C.white }));
  extraRow.appendChild(chipBg);
  extraRow.appendChild(mkText('Extra Label', 'extra per month', { size: 13, color: C.grey600 }));
  infoPanel.appendChild(extraRow);

  mainRow.appendChild(infoPanel);
  card.appendChild(mainRow);
  page.appendChild(card);
  root.appendChild(page);

  // ── Add to canvas & zoom ───────────────────────────────────────────────────
  figma.currentPage.appendChild(root);
  figma.viewport.scrollAndZoomIntoView([root]);
}
