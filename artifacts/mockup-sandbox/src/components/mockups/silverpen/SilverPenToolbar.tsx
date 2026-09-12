import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Eraser,
  Grip,
  Highlighter,
  Minus,
  MoreHorizontal,
  Pencil,
  PenTool,
  Pipette,
  Plus,
  Redo2,
  RotateCcw,
  Sparkles,
  Undo2,
} from "lucide-react";

import "./_silverpen.css";

type PenKind = "ink" | "highlighter" | "pencil" | "fountain" | "technical" | "brush" | "calligraphy";

type PenSpec = {
  kind: PenKind;
  label: string;
  meta: string;
  body: string;
  cap: string;
};

const pens: PenSpec[] = [
  { kind: "ink", label: "Precision", meta: "0.4 mm", body: "#cf6559", cap: "#a94345" },
  { kind: "highlighter", label: "Marker", meta: "Soft edge", body: "#e2b95d", cap: "#b9843e" },
  { kind: "pencil", label: "Graphite", meta: "HB", body: "#bd7258", cap: "#8f4e43" },
  { kind: "fountain", label: "Fountain", meta: "Pressure ink", body: "#4b6fb1", cap: "#304d88" },
  { kind: "technical", label: "Technical", meta: "0.2 mm", body: "#778394", cap: "#3b455c" },
  { kind: "brush", label: "Brush", meta: "Flexible tip", body: "#b86b86", cap: "#713e68" },
  { kind: "calligraphy", label: "Calligraphy", meta: "Chisel edge", body: "#8b6dba", cap: "#554078" },
];

const recentColors = [
  { name: "Parchment", value: "#f1e4ca" },
  { name: "Signal coral", value: "#e87961" },
  { name: "Oxide teal", value: "#2d8b87" },
  { name: "Night ink", value: "#292d55" },
  { name: "Brass", value: "#d9ae57" },
];

function PenVisual({ pen }: { pen: PenSpec }) {
  return (
    <div
      className={`silverpen-pen ${pen.kind}`}
      style={{ "--pen-body": pen.body, "--pen-cap": pen.cap } as React.CSSProperties}
      aria-hidden="true"
    >
      <span className="silverpen-pen-cap" />
      <span className="silverpen-pen-body" />
      <span className="silverpen-pen-band" />
      <span className="silverpen-pen-tip" />
    </div>
  );
}

function ToolButton({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={`silverpen-button h-10 w-10 rounded-xl ${active ? "bg-[#e87961]/20 text-[#ffd6bc]" : ""}`}
    >
      {children}
    </button>
  );
}

export function SilverPenToolbar() {
  const workspaceRef = useRef<HTMLDivElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const penScrollerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef({ active: false, offsetX: 0, offsetY: 0 });
  const penSwipeRef = useRef({ active: false, startX: 0, startScrollLeft: 0, moved: false });
  const suppressPenClickRef = useRef(false);
  const [position, setPosition] = useState({ x: 190, y: 222 });
  const [activePen, setActivePen] = useState<PenKind>("ink");
  const [color, setColor] = useState("#e87961");
  const [thickness, setThickness] = useState(4);
  const [menuOpen, setMenuOpen] = useState(false);
  const [feedback, setFeedback] = useState("Precision pen ready");
  const [penDragging, setPenDragging] = useState(false);

  useEffect(() => {
    const handleMove = (event: PointerEvent) => {
      if (!dragRef.current.active || !workspaceRef.current || !toolbarRef.current) return;
      const workspace = workspaceRef.current.getBoundingClientRect();
      const toolbar = toolbarRef.current.getBoundingClientRect();
      const nextX = event.clientX - workspace.left - dragRef.current.offsetX;
      const nextY = event.clientY - workspace.top - dragRef.current.offsetY;
      const maxX = Math.max(16, workspace.width - toolbar.width - 16);
      const maxY = Math.max(16, workspace.height - toolbar.height - 16);
      setPosition({
        x: Math.min(Math.max(16, nextX), maxX),
        y: Math.min(Math.max(16, nextY), maxY),
      });
    };
    const handleUp = () => {
      dragRef.current.active = false;
    };
    document.addEventListener("pointermove", handleMove);
    document.addEventListener("pointerup", handleUp);
    return () => {
      document.removeEventListener("pointermove", handleMove);
      document.removeEventListener("pointerup", handleUp);
    };
  }, []);

  const beginDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!workspaceRef.current || !toolbarRef.current) return;
    const workspace = workspaceRef.current.getBoundingClientRect();
    const toolbar = toolbarRef.current.getBoundingClientRect();
    dragRef.current = {
      active: true,
      offsetX: event.clientX - toolbar.left,
      offsetY: event.clientY - toolbar.top,
    };
    setFeedback("Toolbar unlocked — drag anywhere");
    event.currentTarget.setPointerCapture?.(event.pointerId);
    void workspace;
  };

  const choosePen = (pen: PenSpec) => {
    setActivePen(pen.kind);
    setFeedback(`${pen.label} selected · ${pen.meta}`);
  };

  const beginPenSwipe = (event: ReactPointerEvent<HTMLDivElement>) => {
    const scroller = penScrollerRef.current;
    if (!scroller || (event.pointerType === "mouse" && event.button !== 0)) return;
    penSwipeRef.current = {
      active: true,
      startX: event.clientX,
      startScrollLeft: scroller.scrollLeft,
      moved: false,
    };
    setPenDragging(false);
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const movePenSwipe = (event: ReactPointerEvent<HTMLDivElement>) => {
    const scroller = penScrollerRef.current;
    if (!scroller || !penSwipeRef.current.active) return;
    const delta = event.clientX - penSwipeRef.current.startX;
    if (Math.abs(delta) > 6) {
      penSwipeRef.current.moved = true;
      setPenDragging(true);
    }
    if (penSwipeRef.current.moved) {
      scroller.scrollLeft = penSwipeRef.current.startScrollLeft - delta;
    }
  };

  const endPenSwipe = () => {
    if (!penSwipeRef.current.active) return;
    if (penSwipeRef.current.moved) {
      suppressPenClickRef.current = true;
      setFeedback("Swipe to browse the instrument set");
    }
    penSwipeRef.current.active = false;
    setPenDragging(false);
  };

  const scrollPens = (amount: number) => {
    penScrollerRef.current?.scrollBy({ left: amount, behavior: "smooth" });
  };

  const chooseColor = (nextColor: string, label: string) => {
    setColor(nextColor);
    setFeedback(`${label} ink selected`);
  };

  return (
    <main ref={workspaceRef} className="silverpen-stage min-h-[100dvh] w-full">
      <div className="absolute left-7 top-6 z-[2] flex items-center gap-3 text-[#293050]">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#202541] text-[#f5e9cc] shadow-md">
          <PenTool size={18} strokeWidth={1.8} />
        </div>
        <div>
          <p className="font-['Space_Mono'] text-[10px] uppercase tracking-[0.22em] text-[#67647a]">Notebook / chapter 04</p>
          <p className="font-['DM_Sans'] text-sm font-semibold tracking-tight">Field notes — kinetic study</p>
        </div>
      </div>

      <div className="silverpen-paper" aria-hidden="true">
        <span className="paper-margin" />
        <span className="paper-line left-[16%] top-[21%] w-[28%]" />
        <span className="paper-line left-[16%] top-[25%] w-[20%]" />
        <span className="paper-line left-[16%] top-[29%] w-[34%]" />
        <span className="paper-line left-[16%] top-[76%] w-[26%]" />
        <span className="paper-line left-[16%] top-[80%] w-[35%]" />
        <span className="paper-stroke left-[64%] top-[19%]" />
        <span className="paper-stroke left-[69%] top-[28%] rotate-[23deg] opacity-60" />
        <div className="absolute right-8 top-7 flex items-center gap-2 rounded-full border border-[#717a93]/20 bg-[#f8f3e9]/80 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[.16em] text-[#747487]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#e87961]" />
          Live canvas
        </div>
        <div className="absolute bottom-7 left-[16%] max-w-[260px] font-['Instrument_Serif'] text-3xl italic text-[#48506e]/30">
          “Make the mark before the thought fades.”
        </div>
      </div>

      <div
        ref={toolbarRef}
        className="silverpen-toolbar"
        style={{ left: position.x, top: position.y }}
      >
        <div className="relative z-[1] p-5">
          <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-4">
            <div className="silverpen-grip flex min-w-0 items-center gap-3" onPointerDown={beginDrag}>
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-[#0d1028] text-[#9b9db4] shadow-inner">
                <Grip size={18} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="font-['Space_Mono'] text-[12px] font-bold uppercase tracking-[.16em] text-[#f4e8ce]">SilverPen</h1>
                  <span className="rounded-full border border-[#d9ae57]/30 bg-[#d9ae57]/10 px-1.5 py-0.5 font-['Space_Mono'] text-[8px] font-bold uppercase tracking-widest text-[#d9ae57]">Studio</span>
                </div>
                <p className="mt-0.5 text-[10px] text-[#989bb1]">Precision instrument tray <span className="text-[#e87961]">/</span> drag by the grip</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <ToolButton label="Undo last mark" onClick={() => setFeedback("Last mark undone")}>
                <Undo2 size={17} />
              </ToolButton>
              <ToolButton label="Redo last mark" onClick={() => setFeedback("Last mark restored")}>
                <Redo2 size={17} />
              </ToolButton>
              <div className="silverpen-divider mx-2 h-7" />
              <ToolButton label="Erase marks" onClick={() => setFeedback("Eraser active · tap a mark to remove it")}>
                <Eraser size={17} />
              </ToolButton>
              <div className="relative">
                <ToolButton label="More SilverPen options" active={menuOpen} onClick={() => setMenuOpen((open) => !open)}>
                  <MoreHorizontal size={20} />
                </ToolButton>
                {menuOpen && (
                  <div className="silverpen-menu">
                    <button type="button" className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[11px] text-[#e4e5eb] hover:bg-white/10" onClick={() => setFeedback("Pressure curve: responsive")}>
                      <Sparkles size={14} className="text-[#d9ae57]" /> Pressure curve <span className="ml-auto text-[#8e91a6]">Responsive</span>
                    </button>
                    <button type="button" className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[11px] text-[#e4e5eb] hover:bg-white/10" onClick={() => setFeedback("Palm rejection enabled")}>
                      <Check size={14} className="text-[#7fced0]" /> Palm rejection <span className="ml-auto text-[#8e91a6]">On</span>
                    </button>
                    <button type="button" className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[11px] text-[#e4e5eb] hover:bg-white/10" onClick={() => setFeedback("Toolbar settings opened")}>
                      <CircleHelp size={14} className="text-[#e87961]" /> Instrument settings
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="mt-5 flex gap-4">
            <div className="silverpen-pen-carousel relative min-w-0 flex-1">
              <button
                type="button"
                aria-label="Previous pens"
                className="silverpen-carousel-arrow left-1"
                onPointerDown={(event) => event.stopPropagation()}
                onClick={() => scrollPens(-220)}
              >
                <ChevronLeft size={15} />
              </button>
              <div
                ref={penScrollerRef}
                className={`silverpen-pen-scroller flex gap-3 pb-1 ${penDragging ? "is-dragging" : ""}`}
                onPointerDown={beginPenSwipe}
                onPointerMove={movePenSwipe}
                onPointerUp={endPenSwipe}
                onPointerCancel={endPenSwipe}
              >
                {pens.map((pen) => (
                  <button
                    key={pen.kind}
                    type="button"
                    className={`silverpen-pen-card ${activePen === pen.kind ? "is-selected" : ""}`}
                    onClick={() => {
                      if (suppressPenClickRef.current) {
                        suppressPenClickRef.current = false;
                        return;
                      }
                      choosePen(pen);
                    }}
                    aria-pressed={activePen === pen.kind}
                  >
                    <div className="flex h-[168px] items-center justify-center pt-2">
                      <PenVisual pen={pen} />
                    </div>
                    <div className="pen-label border-t border-white/10 px-3 py-2 text-left">
                      <p className="text-[11px] font-bold tracking-wide text-[#f4e8ce]">{pen.label}</p>
                      <p className="mt-0.5 font-['Space_Mono'] text-[9px] uppercase tracking-wider text-[#999caf]">{pen.meta}</p>
                    </div>
                    {activePen === pen.kind && <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-[#e87961] text-[#21182b]"><Check size={12} strokeWidth={3} /></span>}
                  </button>
                ))}
              </div>
              <button
                type="button"
                aria-label="Next pens"
                className="silverpen-carousel-arrow right-1"
                onPointerDown={(event) => event.stopPropagation()}
                onClick={() => scrollPens(220)}
              >
                <ChevronRight size={15} />
              </button>
              <div className="silverpen-swipe-hint">
                <Grip size={11} /> Swipe to browse
              </div>
            </div>

            <div className="w-[188px] shrink-0 rounded-[15px] border border-white/10 bg-[#0f1330]/65 p-3">
              <div className="mb-3 flex items-center justify-between">
                <p className="font-['Space_Mono'] text-[9px] font-bold uppercase tracking-[.16em] text-[#9b9eb5]">Stroke</p>
                <span className="rounded-md bg-[#e87961]/15 px-1.5 py-1 font-['Space_Mono'] text-[10px] font-bold text-[#ffc2aa]">{thickness}px</span>
              </div>
              <div className="flex items-center gap-2">
                <Minus size={13} className="text-[#85899e]" />
                <input
                  aria-label="Line thickness"
                  className="silverpen-range h-1.5 w-full cursor-pointer"
                  type="range"
                  min="1"
                  max="16"
                  value={thickness}
                  onChange={(event) => {
                    setThickness(Number(event.target.value));
                    setFeedback(`Stroke weight set to ${event.target.value}px`);
                  }}
                />
                <Plus size={13} className="text-[#85899e]" />
              </div>
              <div className="mt-4 flex h-[42px] items-center justify-center rounded-lg border border-white/10 bg-[#f2e6ce]">
                <span className="rounded-full" style={{ width: Math.max(3, thickness), height: Math.max(3, thickness), backgroundColor: color }} />
              </div>
              <p className="mt-2 text-center text-[9px] text-[#777c98]">Pressure responsive</p>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-4 border-t border-white/10 pt-4">
            <div className="flex items-center gap-2">
              <Pipette size={14} className="text-[#8f93aa]" />
              <span className="font-['Space_Mono'] text-[9px] uppercase tracking-[.16em] text-[#8f93aa]">Recent ink</span>
              <div className="ml-1 flex items-center gap-2">
                {recentColors.map((recent) => (
                  <button
                    key={recent.value}
                    type="button"
                    aria-label={`Use ${recent.name}`}
                    title={recent.name}
                    onClick={() => chooseColor(recent.value, recent.name)}
                    className={`h-6 w-6 rounded-full border-2 transition-transform hover:scale-110 ${color === recent.value ? "border-[#f6e7c2] scale-110" : "border-white/20"}`}
                    style={{ backgroundColor: recent.value }}
                  />
                ))}
                <label className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-full border border-dashed border-white/30 text-[#b8bac8] transition-colors hover:border-[#e87961] hover:text-[#e87961]" title="Choose a custom ink color">
                  <Plus size={13} />
                  <input type="color" value={color} onChange={(event) => chooseColor(event.target.value, "Custom")} className="sr-only" aria-label="Choose custom ink color" />
                </label>
              </div>
            </div>
            <div className="ml-auto flex items-center gap-2 text-[10px] text-[#8e91a7]">
              <span className="silverpen-hint h-1.5 w-1.5 rounded-full bg-[#7fced0]" />
              <span>{feedback}</span>
              <ChevronDown size={13} className="text-[#666a84]" />
            </div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-5 left-7 z-[2] flex items-center gap-2 font-['Space_Mono'] text-[9px] uppercase tracking-[.15em] text-[#7c7881]">
        <RotateCcw size={12} />
        <span>Floating tray · position freely</span>
      </div>
      <div className="absolute bottom-5 right-7 z-[2] rounded-full border border-[#717a93]/20 bg-[#f8f3e9]/70 px-3 py-1.5 font-['Space_Mono'] text-[9px] uppercase tracking-[.15em] text-[#7c7881]">
        {Math.round(position.x)} / {Math.round(position.y)}
      </div>
    </main>
  );
}

export default SilverPenToolbar;