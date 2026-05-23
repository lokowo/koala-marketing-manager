'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Canvas, FabricImage, Textbox, Rect, Group, FabricObject, Gradient, Shadow } from 'fabric';
import QRCode from 'qrcode';
import { POSTER_FONTS, loadPosterFonts, DEFAULT_ZH_FONT } from './poster-fonts';

// ── Types & Constants ───────────────────────────────────

interface ImageBgDef { id: string; src: string; label: string; }
type PosterSize = '3:4' | '1:1' | '9:16';
type EK = 'logo'|'title'|'subtitle'|'pt1'|'pt2'|'pt3'|'pt4'|'qr'|'scanLabel'|'inviteCode'|'url'|'channel';

const IMAGE_BGS: ImageBgDef[] = [
  { id: '11', src: '/images/posters/11.png', label: '砂岩主楼' },
  { id: '22', src: '/images/posters/22.png', label: '蓝花楹校园' },
  { id: '33', src: '/images/posters/33.png', label: '林荫主楼' },
  { id: '44', src: '/images/posters/44.png', label: 'STEM大楼' },
  { id: '55', src: '/images/posters/55.png', label: '图书馆' },
  { id: '66', src: '/images/posters/66.png', label: '蓝花楹步道' },
];

const SIZE_CFG: Record<PosterSize,{w:number;h:number;label:string}> = {
  '3:4': { w: 1080, h: 1440, label: '3:4 社交媒体' },
  '1:1': { w: 1080, h: 1080, label: '1:1 方形' },
  '9:16':{ w: 1080, h: 1920, label: '9:16 竖屏' },
};

const CH_OPTS = [
  {v:'wechat',l:'微信'},{v:'xiaohongshu',l:'小红书'},{v:'douyin',l:'抖音'},
  {v:'weibo',l:'微博'},{v:'zhihu',l:'知乎'},{v:'bilibili',l:'Bilibili'},
  {v:'email',l:'邮件'},{v:'whatsapp',l:'WhatsApp'},{v:'tiktok',l:'TikTok'},
  {v:'instagram',l:'Instagram'},{v:'x',l:'X (Twitter)'},{v:'telegram',l:'Telegram'},
  {v:'other',l:'其他'},
];

const CH_LABELS: Record<string,string> = {
  wechat:'微信推广',xiaohongshu:'小红书推广',douyin:'抖音推广',weibo:'微博推广',
  zhihu:'知乎推广',bilibili:'B站推广',email:'邮件推广',whatsapp:'WhatsApp推广',
  tiktok:'TikTok推广',instagram:'Instagram推广',x:'X推广',telegram:'Telegram推广',other:'其他渠道',
};

const SELLING_PTS = [
  '✦ AI 智能匹配，精准推荐导师',
  '✦ 一键生成个性化套磁信',
  '✦ 研究计划智能对齐',
  '✦ 申请进度全程追踪',
];

type TextColor = '#FFFFFF'|'#1F2937'|'#D4A843';
const TXT_COLORS: {value:TextColor;label:string}[] = [
  {value:'#FFFFFF',label:'白'},{value:'#1F2937',label:'黑'},{value:'#D4A843',label:'金'},
];

const BG_KEY = '__isBg';
const OV_KEY = '__isOv';
const QR_KEY = '__isQR';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function meta(o: FabricObject): any { return o as any; }

const sh = new Shadow({color:'rgba(0,0,0,0.6)',blur:6,offsetX:1,offsetY:2});
const shSm = new Shadow({color:'rgba(0,0,0,0.4)',blur:3,offsetX:1,offsetY:1});

function layout(w: number, h: number) {
  const pad = 40;
  const qrSz = 270, qrPd = 20, qrTotH = qrSz + qrPd * 2;
  const ptGap = Math.round(h * 0.035);
  return {
    pad,
    logo:   { left: pad, top: pad, fontSize: 18 },
    title:  { left: w/2, top: h*0.10, fontSize: 48, width: w - pad*2 },
    sub:    { left: w/2, top: h*0.17, fontSize: 24, width: w - pad*2 },
    pts:    [0,1,2,3].map(i => ({ left: pad+20, top: h*0.27 + i*ptGap, fontSize: 20, width: w-pad*2-40 })),
    qrSz, qrPd,
    qr:     { left: (w-qrSz-qrPd*2)/2, top: h*0.48 },
    scan:   { left: w/2, top: h*0.48 + qrTotH + 16, fontSize: 14 },
    invite: { left: w/2, top: h*0.48 + qrTotH + 44, fontSize: 16 },
    url:    { left: pad, top: h - pad - 14, fontSize: 12 },
    ch:     { left: w - pad, top: h - pad - 14, fontSize: 12 },
  };
}

// ── Component ───────────────────────────────────────────

interface Props { referralCode: string; channel: string; }

export default function ImagePosterEditor({ referralCode, channel }: Props) {
  const cRef = useRef<HTMLCanvasElement>(null);
  const fcRef = useRef<Canvas|null>(null);
  const elRef = useRef<Partial<Record<EK,FabricObject>>>({});
  const initDone = useRef(false);

  const [ready, setReady] = useState(false);
  const [bgId, setBgId] = useState('11');
  const [size, setSize] = useState<PosterSize>('3:4');
  const [titleTxt, setTitleTxt] = useState('用 AI 找到你的理想 PhD 导师');
  const [subTxt, setSubTxt] = useState('覆盖澳洲38所大学、24,000+位教授');
  const [ch, setCh] = useState(channel);
  const [gFont, setGFont] = useState(DEFAULT_ZH_FONT);
  const [vis, setVis] = useState({ qr:true, url:true, inviteCode:true, channel:true });
  const [selObj, setSelObj] = useState<FabricObject|null>(null);
  const [tb, setTb] = useState({ fontFamily:DEFAULT_ZH_FONT, fontSize:48, fill:'#FFFFFF' as string, fontWeight:'bold' as string });

  useEffect(() => { loadPosterFonts().then(() => setReady(true)); }, []);

  useEffect(() => {
    if (!cRef.current || initDone.current || !ready) return;
    initDone.current = true;
    const {w,h} = SIZE_CFG[size];
    const fc = new Canvas(cRef.current, { width:w, height:h, backgroundColor:'#0F1419', selection:true, preserveObjectStacking:true });
    fc.on('selection:created', e => onSel(e.selected?.[0]??null));
    fc.on('selection:updated', e => onSel(e.selected?.[0]??null));
    fc.on('selection:cleared', () => onSel(null));
    fcRef.current = fc;
    paintBg(fc, bgId, size).then(() => buildPreset(fc, w, h));
    return () => { fc.dispose(); initDone.current = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  function onSel(obj: FabricObject|null) {
    if (!obj || !(obj instanceof Textbox)) { setSelObj(null); return; }
    setSelObj(obj);
    setTb({ fontFamily:(obj.fontFamily as string)||DEFAULT_ZH_FONT, fontSize:obj.fontSize||48, fill:(obj.fill as string)||'#FFFFFF', fontWeight:(obj.fontWeight as string)||'normal' });
  }

  // ── Background: image cover-fit + fog + scrim ─────────
  async function paintBg(fc: Canvas, id: string, sz: PosterSize) {
    const {w,h} = SIZE_CFG[sz];
    fc.getObjects().filter(o => meta(o)[BG_KEY]||meta(o)[OV_KEY]).forEach(o => fc.remove(o));
    const bgDef = IMAGE_BGS.find(b => b.id === id);
    if (!bgDef) return;

    try {
      const img = await FabricImage.fromURL(bgDef.src, { crossOrigin: 'anonymous' });
      const imgW = img.width || 1080, imgH = img.height || 1440;
      const scale = Math.max(w / imgW, h / imgH);
      img.set({
        scaleX: scale, scaleY: scale,
        left: (w - imgW * scale) / 2,
        top: (h - imgH * scale) / 2,
        selectable: false, evented: false,
      });
      meta(img)[BG_KEY] = true;
      fc.insertAt(0, img);
    } catch (e) {
      console.error('Image load failed', e);
    }

    const fog = new Rect({
      left:0, top:0, width:w, height:h,
      selectable:false, evented:false,
      fill: '#0F1419', opacity: 0.50,
    });
    meta(fog)[OV_KEY] = true;
    fc.insertAt(1, fog);

    const topScrim = new Rect({
      left:0, top:0, width:w, height: Math.round(h*0.45),
      selectable:false, evented:false,
      fill: new Gradient({
        type:'linear', coords:{x1:0,y1:0,x2:0,y2:Math.round(h*0.45)},
        colorStops:[{offset:0,color:'rgba(15,20,25,0.55)'},{offset:0.6,color:'rgba(15,20,25,0.15)'},{offset:1,color:'rgba(15,20,25,0)'}],
      }),
    });
    meta(topScrim)[OV_KEY] = true;
    fc.insertAt(2, topScrim);

    const bottomScrim = new Rect({
      left:0, top: Math.round(h*0.55), width:w, height: Math.round(h*0.45),
      selectable:false, evented:false,
      fill: new Gradient({
        type:'linear', coords:{x1:0,y1:0,x2:0,y2:Math.round(h*0.45)},
        colorStops:[{offset:0,color:'rgba(15,20,25,0)'},{offset:0.5,color:'rgba(15,20,25,0.40)'},{offset:1,color:'rgba(15,20,25,0.55)'}],
      }),
    });
    meta(bottomScrim)[OV_KEY] = true;
    fc.insertAt(3, bottomScrim);

    fc.requestRenderAll();
  }

  // ── Preset elements (always dark bg — white text) ─────
  async function buildPreset(fc: Canvas, w: number, h: number) {
    const L = layout(w, h);
    const font = gFont;
    const fg = '#FFFFFF';
    const fgSub = 'rgba(255,255,255,0.7)';
    const els: Partial<Record<EK,FabricObject>> = {};

    const logo = new Textbox('Koala PhD 考拉博士', {
      left:L.logo.left, top:L.logo.top, fontSize:L.logo.fontSize,
      fontFamily:font, fontWeight:'bold', fill:'#F59E0B', width:360,
      selectable:false, evented:false, shadow:shSm,
    });
    meta(logo).__ek = 'logo'; fc.add(logo); els.logo = logo;

    const title = new Textbox(titleTxt, {
      left:L.title.left, top:L.title.top, fontSize:L.title.fontSize,
      fontFamily:font, fontWeight:'bold', fill:fg, width:L.title.width,
      lineHeight:1.3, textAlign:'center', originX:'center', shadow:sh,
    });
    meta(title).__ek = 'title'; fc.add(title); els.title = title;

    const sub = new Textbox(subTxt, {
      left:L.sub.left, top:L.sub.top, fontSize:L.sub.fontSize,
      fontFamily:font, fill:fgSub, width:L.sub.width,
      textAlign:'center', originX:'center', shadow:shSm,
    });
    meta(sub).__ek = 'subtitle'; fc.add(sub); els.subtitle = sub;

    SELLING_PTS.forEach((txt,i) => {
      const k = `pt${i+1}` as EK;
      const p = L.pts[i];
      const t = new Textbox(txt, {
        left:p.left, top:p.top, fontSize:p.fontSize,
        fontFamily:font, fill:fg, width:p.width, shadow:shSm,
      });
      meta(t).__ek = k; fc.add(t); els[k] = t;
    });

    const url = `https://koalaphd.com/koala/auth?ref=${referralCode}&ch=${ch}`;
    try {
      const qrDataUrl = await QRCode.toDataURL(url, { width:480, margin:2, color:{dark:'#1a2332',light:'#FFFFFF'} });
      const qrImg = await FabricImage.fromURL(qrDataUrl);
      qrImg.set({ left:L.qrPd, top:L.qrPd, scaleX:L.qrSz/(qrImg.width||L.qrSz), scaleY:L.qrSz/(qrImg.height||L.qrSz) });
      const qrBg = new Rect({ left:0,top:0, width:L.qrSz+L.qrPd*2, height:L.qrSz+L.qrPd*2, fill:'#FFFFFF', rx:16, ry:16, shadow: new Shadow({color:'rgba(0,0,0,0.15)',blur:12,offsetX:0,offsetY:4}) });
      const qrGrp = new Group([qrBg, qrImg], { left:L.qr.left, top:L.qr.top, visible:vis.qr });
      meta(qrGrp)[QR_KEY] = true; meta(qrGrp).__ek = 'qr';
      fc.add(qrGrp); els.qr = qrGrp;
    } catch(e) { console.error('QR failed',e); }

    const scan = new Textbox('扫码注册', {
      left:L.scan.left, top:L.scan.top, fontSize:L.scan.fontSize,
      fontFamily:font, fill:fgSub, width:300, textAlign:'center', originX:'center', shadow:shSm, visible:vis.qr,
    });
    meta(scan).__ek = 'scanLabel'; fc.add(scan); els.scanLabel = scan;

    const invite = new Textbox(`邀请码: ${referralCode}`, {
      left:L.invite.left, top:L.invite.top, fontSize:L.invite.fontSize,
      fontFamily:font, fontWeight:'bold', fill:fg, width:300, textAlign:'center', originX:'center', shadow:shSm, visible:vis.inviteCode,
    });
    meta(invite).__ek = 'inviteCode'; fc.add(invite); els.inviteCode = invite;

    const urlEl = new Textbox('www.koalaphd.com', {
      left:L.url.left, top:L.url.top, fontSize:L.url.fontSize,
      fontFamily:font, fill:fgSub, width:300, shadow:shSm, visible:vis.url,
    });
    meta(urlEl).__ek = 'url'; fc.add(urlEl); els.url = urlEl;

    const chEl = new Textbox(CH_LABELS[ch]||ch, {
      left:L.ch.left, top:L.ch.top, fontSize:L.ch.fontSize,
      fontFamily:font, fill:fgSub, width:300, textAlign:'right', originX:'right', shadow:shSm, visible:vis.channel,
    });
    meta(chEl).__ek = 'channel'; fc.add(chEl); els.channel = chEl;

    elRef.current = els;
    fc.requestRenderAll();
  }

  // ── Relayout on size switch ───────────────────────────
  function relayout(sz: PosterSize) {
    const L = layout(SIZE_CFG[sz].w, SIZE_CFG[sz].h);
    const els = elRef.current;
    const r = (k:EK, p:Record<string,unknown>) => { const o=els[k]; if(o) o.set(p); };
    r('logo',  { left:L.logo.left, top:L.logo.top, fontSize:L.logo.fontSize });
    r('title', { left:L.title.left, top:L.title.top, fontSize:L.title.fontSize, width:L.title.width });
    r('subtitle',{ left:L.sub.left, top:L.sub.top, fontSize:L.sub.fontSize, width:L.sub.width });
    L.pts.forEach((p,i) => r(`pt${i+1}` as EK, { left:p.left, top:p.top, fontSize:p.fontSize, width:p.width }));
    r('qr',    { left:L.qr.left, top:L.qr.top });
    r('scanLabel',  { left:L.scan.left, top:L.scan.top, fontSize:L.scan.fontSize });
    r('inviteCode', { left:L.invite.left, top:L.invite.top, fontSize:L.invite.fontSize });
    r('url',   { left:L.url.left, top:L.url.top, fontSize:L.url.fontSize });
    r('channel',{ left:L.ch.left, top:L.ch.top, fontSize:L.ch.fontSize });
    fcRef.current?.requestRenderAll();
  }

  // ── Sync helpers ──────────────────────────────────────
  function syncTitle(t:string) { setTitleTxt(t); const e=elRef.current.title; if(e instanceof Textbox){e.set('text',t);fcRef.current?.requestRenderAll();} }
  function syncSub(t:string) { setSubTxt(t); const e=elRef.current.subtitle; if(e instanceof Textbox){e.set('text',t);fcRef.current?.requestRenderAll();} }
  function syncCh(c:string) { setCh(c); const e=elRef.current.channel; if(e instanceof Textbox){e.set('text',CH_LABELS[c]||c);fcRef.current?.requestRenderAll();} }
  function syncFont(f:string) { setGFont(f); const fc=fcRef.current; if(!fc) return; for(const o of fc.getObjects()) if(o instanceof Textbox) o.set('fontFamily',f); fc.requestRenderAll(); }

  // ── Actions ───────────────────────────────────────────
  const switchBg = useCallback(async (id:string) => {
    setBgId(id);
    const fc=fcRef.current; if(!fc) return;
    await paintBg(fc, id, size);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size]);

  const switchSize = useCallback(async (sz:PosterSize) => {
    const fc=fcRef.current; if(!fc) return;
    setSize(sz);
    const {w,h} = SIZE_CFG[sz];
    fc.setDimensions({width:w,height:h});
    await paintBg(fc, bgId, sz);
    relayout(sz);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bgId]);

  function toggleVis(key: keyof typeof vis) {
    setVis(prev => {
      const next = {...prev, [key]:!prev[key]};
      const el = elRef.current[key]; if(el) el.set('visible',next[key]);
      if(key==='qr') { const s=elRef.current.scanLabel; if(s) s.set('visible',next[key]); }
      fcRef.current?.requestRenderAll();
      return next;
    });
  }

  async function regenerate() {
    const fc=fcRef.current; if(!fc) return;
    fc.getObjects().filter(o => !meta(o)[BG_KEY]&&!meta(o)[OV_KEY]).forEach(o => fc.remove(o));
    elRef.current = {}; setSelObj(null);
    const {w,h}=SIZE_CFG[size];
    await buildPreset(fc, w, h);
  }

  function addText() {
    const fc=fcRef.current; if(!fc) return;
    const {w,h}=SIZE_CFG[size];
    const t = new Textbox('双击编辑文字',{ left:w/2-150,top:h/2-30,fontSize:28,fontFamily:gFont,fill:'#FFFFFF',width:300,shadow:sh });
    fc.add(t); fc.setActiveObject(t); fc.requestRenderAll();
  }

  async function addQR() {
    const fc=fcRef.current; if(!fc) return;
    const oldQr=elRef.current.qr; if(oldQr) fc.remove(oldQr);
    const L=layout(SIZE_CFG[size].w, SIZE_CFG[size].h);
    const url=`https://koalaphd.com/koala/auth?ref=${referralCode}&ch=${ch}`;
    try {
      const d=await QRCode.toDataURL(url,{width:480,margin:2,color:{dark:'#1a2332',light:'#FFFFFF'}});
      const img=await FabricImage.fromURL(d);
      img.set({left:L.qrPd,top:L.qrPd,scaleX:L.qrSz/(img.width||L.qrSz),scaleY:L.qrSz/(img.height||L.qrSz)});
      const bg=new Rect({left:0,top:0,width:L.qrSz+L.qrPd*2,height:L.qrSz+L.qrPd*2,fill:'#FFFFFF',rx:16,ry:16,shadow:new Shadow({color:'rgba(0,0,0,0.15)',blur:12,offsetX:0,offsetY:4})});
      const g=new Group([bg,img],{left:L.qr.left,top:L.qr.top,visible:vis.qr});
      meta(g)[QR_KEY]=true; meta(g).__ek='qr';
      fc.add(g); elRef.current.qr=g;
    } catch(e){console.error('QR failed',e);}
    fc.requestRenderAll();
  }

  function updateSel(prop:string,val:unknown) {
    if(!selObj||!(selObj instanceof Textbox)) return;
    selObj.set(prop as keyof Textbox, val); fcRef.current?.requestRenderAll();
    setTb(prev=>({...prev,[prop]:val}));
  }

  function deleteSel() {
    const fc=fcRef.current; if(!fc||!selObj) return;
    if(meta(selObj).__ek==='logo') return;
    fc.remove(selObj);
    const k=meta(selObj).__ek as EK|undefined;
    if(k) delete elRef.current[k];
    setSelObj(null); fc.requestRenderAll();
  }

  function exportPNG() {
    const fc=fcRef.current; if(!fc) return;
    fc.discardActiveObject(); fc.requestRenderAll();
    const d=fc.toDataURL({format:'png',quality:1,multiplier:1});
    const a=document.createElement('a'); a.download=`koala-poster-img-${bgId}-${referralCode}.png`; a.href=d; a.click();
  }

  // ── Render ────────────────────────────────────────────
  if (!ready) return <Loading />;

  const {w:cW,h:cH} = SIZE_CFG[size];
  const zhF = POSTER_FONTS.filter(f=>f.category==='zh');
  const enF = POSTER_FONTS.filter(f=>f.category==='en');

  return (
    <div className="space-y-4">
      <div className="flex flex-col lg:flex-row gap-4">
        {/* ── Left panel ── */}
        <div className="w-full lg:w-[280px] shrink-0 space-y-3 max-h-[calc(100vh-200px)] lg:overflow-y-auto">
          <Sec title="图片背景">
            <div className="grid grid-cols-3 gap-2">
              {IMAGE_BGS.map(bg => (
                <button key={bg.id} onClick={()=>switchBg(bg.id)}
                  className={`relative rounded-lg overflow-hidden aspect-[3/4] transition-all ${bgId===bg.id?'ring-2 ring-[#F59E0B] ring-offset-1 ring-offset-white dark:ring-offset-[#1E293B]':'hover:ring-1 hover:ring-[#D1D5DB] dark:hover:ring-[#475569]'}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={bg.src} alt={bg.label} className="w-full h-full object-cover"/>
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-1">
                    <span className="text-[9px] text-white block text-center">{bg.label}</span>
                  </div>
                  {bgId===bg.id && <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-[#F59E0B] flex items-center justify-center"><svg width="10" height="10" viewBox="0 0 16 16" fill="none"><path d="M3 8l3 3 7-7" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg></div>}
                </button>
              ))}
            </div>
          </Sec>

          <Sec title="文案编辑">
            <label className="text-[10px] text-[#6B7280] dark:text-[#94A3B8] block mb-1">主标题</label>
            <input value={titleTxt} onChange={e=>syncTitle(e.target.value)} className="w-full rounded-lg px-2.5 py-1.5 text-xs bg-[#F9FAFB] dark:bg-[#0F172A] border border-[#E5E7EB] dark:border-[#334155] text-[#111827] dark:text-[#F1F5F9] mb-2"/>
            <label className="text-[10px] text-[#6B7280] dark:text-[#94A3B8] block mb-1">副标题</label>
            <input value={subTxt} onChange={e=>syncSub(e.target.value)} className="w-full rounded-lg px-2.5 py-1.5 text-xs bg-[#F9FAFB] dark:bg-[#0F172A] border border-[#E5E7EB] dark:border-[#334155] text-[#111827] dark:text-[#F1F5F9]"/>
          </Sec>

          <Sec title="推广渠道">
            <select value={ch} onChange={e=>syncCh(e.target.value)} className="w-full rounded-lg px-2.5 py-1.5 text-xs bg-[#F9FAFB] dark:bg-[#0F172A] border border-[#E5E7EB] dark:border-[#334155] text-[#111827] dark:text-[#F1F5F9]">
              {CH_OPTS.map(c=><option key={c.v} value={c.v}>{c.l}</option>)}
            </select>
          </Sec>

          <Sec title="字体">
            <select value={gFont} onChange={e=>syncFont(e.target.value)} className="w-full rounded-lg px-2.5 py-1.5 text-xs bg-[#F9FAFB] dark:bg-[#0F172A] border border-[#E5E7EB] dark:border-[#334155] text-[#111827] dark:text-[#F1F5F9]">
              <optgroup label="中文">{zhF.map(f=><option key={f.family} value={f.family}>{f.label}</option>)}</optgroup>
              <optgroup label="英文">{enF.map(f=><option key={f.family} value={f.family}>{f.label}</option>)}</optgroup>
            </select>
          </Sec>

          <Sec title="显示开关">
            {([['qr','二维码'],['url','网址文字'],['inviteCode','邀请码'],['channel','渠道标识']] as const).map(([k,label])=>(
              <label key={k} className="flex items-center gap-2 text-[11px] text-[#374151] dark:text-[#CBD5E1] cursor-pointer">
                <input type="checkbox" checked={vis[k]} onChange={()=>toggleVis(k)} className="rounded border-[#D1D5DB] text-[#F59E0B] focus:ring-[#F59E0B]"/>
                {label}
              </label>
            ))}
          </Sec>

          <Sec title="尺寸">
            <div className="flex gap-1.5">
              {(Object.entries(SIZE_CFG) as [PosterSize,typeof SIZE_CFG['3:4']][]).map(([k,cfg])=>(
                <button key={k} onClick={()=>switchSize(k)}
                  className={`flex-1 py-1.5 rounded-lg text-[11px] font-medium transition ${size===k?'bg-[#FEF3C7] dark:bg-[#F59E0B]/20 text-[#92400E] dark:text-[#F59E0B]':'bg-[#F3F4F6] dark:bg-[#334155] text-[#6B7280] dark:text-[#94A3B8] hover:bg-[#E5E7EB] dark:hover:bg-[#475569]'}`}>
                  {cfg.label}
                </button>
              ))}
            </div>
          </Sec>

          <Sec title="添加元素">
            <div className="flex gap-2">
              <button onClick={addText} className="flex-1 py-2 rounded-lg text-xs font-medium bg-[#F3F4F6] dark:bg-[#334155] text-[#374151] dark:text-[#CBD5E1] hover:bg-[#E5E7EB] dark:hover:bg-[#475569] transition flex items-center justify-center gap-1.5">+ 文字</button>
              <button onClick={addQR} className="flex-1 py-2 rounded-lg text-xs font-medium bg-[#F3F4F6] dark:bg-[#334155] text-[#374151] dark:text-[#CBD5E1] hover:bg-[#E5E7EB] dark:hover:bg-[#475569] transition flex items-center justify-center gap-1.5">+ QR码</button>
            </div>
          </Sec>

          {selObj instanceof Textbox && (
            <div className="rounded-xl p-3 bg-white dark:bg-[#1E293B] border border-[#F59E0B]/40 shadow-sm space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="text-xs font-medium text-[#374151] dark:text-[#CBD5E1]">文字样式</div>
                <button onClick={deleteSel} className="text-[10px] px-2 py-1 rounded bg-[#FEE2E2] dark:bg-[#7F1D1D]/30 text-[#991B1B] dark:text-[#F87171]">删除</button>
              </div>
              <div>
                <label className="text-[10px] text-[#6B7280] dark:text-[#94A3B8] block mb-1">字体</label>
                <select value={tb.fontFamily} onChange={e=>updateSel('fontFamily',e.target.value)} className="w-full rounded-lg px-2 py-1.5 text-xs bg-[#F9FAFB] dark:bg-[#0F172A] border border-[#E5E7EB] dark:border-[#334155] text-[#111827] dark:text-[#F1F5F9]">
                  <optgroup label="中文">{zhF.map(f=><option key={f.family} value={f.family}>{f.label}</option>)}</optgroup>
                  <optgroup label="英文">{enF.map(f=><option key={f.family} value={f.family}>{f.label}</option>)}</optgroup>
                </select>
              </div>
              <div>
                <label className="text-[10px] text-[#6B7280] dark:text-[#94A3B8] flex justify-between mb-1"><span>字号</span><span className="font-mono">{tb.fontSize}px</span></label>
                <input type="range" min={10} max={80} value={tb.fontSize} onChange={e=>updateSel('fontSize',Number(e.target.value))} className="w-full accent-[#F59E0B]"/>
              </div>
              <div>
                <label className="text-[10px] text-[#6B7280] dark:text-[#94A3B8] block mb-1">颜色</label>
                <div className="flex gap-1.5">
                  {TXT_COLORS.map(c=>(
                    <button key={c.value} onClick={()=>updateSel('fill',c.value)}
                      className={`flex-1 py-1.5 rounded-lg text-[11px] font-medium transition ${tb.fill===c.value?'ring-2 ring-[#F59E0B] ring-offset-1':''}`}
                      style={{background:c.value==='#FFFFFF'?'#F3F4F6':c.value==='#1F2937'?'#1E293B':'#D4A843',color:c.value==='#FFFFFF'?'#374151':'#FFFFFF'}}>
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>
              <button onClick={()=>updateSel('fontWeight',tb.fontWeight==='bold'?'normal':'bold')}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition ${tb.fontWeight==='bold'?'bg-[#111827] dark:bg-[#F1F5F9] text-white dark:text-[#0F172A]':'bg-[#F3F4F6] dark:bg-[#334155] text-[#6B7280]'}`}>
                B
              </button>
            </div>
          )}
        </div>

        {/* ── Right: Canvas ── */}
        <div className="flex-1 min-w-0">
          <div className="rounded-xl bg-[#F9FAFB] dark:bg-[#0F172A] border border-[#E5E7EB] dark:border-[#334155] p-4 flex items-center justify-center overflow-hidden">
            <div style={{width:'100%',maxWidth:540,aspectRatio:`${cW}/${cH}`,position:'relative'}}>
              <canvas ref={cRef} style={{width:'100%',height:'100%',display:'block',borderRadius:8}}/>
            </div>
          </div>
        </div>
      </div>

      {/* ── Bottom bar ── */}
      <div className="flex items-center justify-between gap-3 rounded-xl p-3 bg-white dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155]">
        <button onClick={regenerate} className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium bg-[#F3F4F6] dark:bg-[#334155] text-[#374151] dark:text-[#CBD5E1] hover:bg-[#E5E7EB] dark:hover:bg-[#475569] transition">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M2 8a6 6 0 0111.47-2.47M14 8a6 6 0 01-11.47 2.47" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><path d="M14 2v4h-4M2 14v-4h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          重新生成
        </button>
        <button onClick={exportPNG} className="flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-xs font-medium bg-[#F59E0B] text-white hover:bg-[#D97706] transition shadow-sm">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M2 11v2a1 1 0 001 1h10a1 1 0 001-1v-2M8 2v9M5 8l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          下载 PNG
        </button>
      </div>
    </div>
  );
}

function Sec({title,children}:{title:string;children:React.ReactNode}) {
  return <div className="rounded-xl p-3 bg-white dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] space-y-2"><div className="text-xs font-medium text-[#374151] dark:text-[#CBD5E1]">{title}</div>{children}</div>;
}

function Loading() {
  return <div className="flex items-center justify-center py-20 gap-2 text-sm text-[#6B7280] dark:text-[#94A3B8]"><span className="w-4 h-4 border-2 border-[#F59E0B] border-t-transparent rounded-full animate-spin"/>字体加载中…</div>;
}
