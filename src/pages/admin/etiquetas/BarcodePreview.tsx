import { useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";

export function BarcodePreview({ codigo, codigoInterno }: { codigo: string; codigoInterno?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !codigo) return;
    
    // El código debe tener algo para que JsBarcode no tire error
    const codeToRender = codigo.trim() || "000000000000";

    try {
      JsBarcode(canvas, codeToRender, {
        format: "CODE128", 
        width: 2,
        height: 52,
        displayValue: true,
        fontSize: 14,
        margin: 10,
        background: "#ffffff",
        lineColor: "#000000",
      });
    } catch (error) {
      // Si el código está incompleto o es inválido
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "#94a3b8";
        ctx.font = "12px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("Código incompleto o inválido", canvas.width / 2, canvas.height / 2);
      }
    }
  }, [codigo, codigoInterno]);

  return (
    <div className="flex flex-col items-center w-full bg-white rounded border border-slate-600 overflow-hidden p-2">
      {codigoInterno && (
        <div className="w-full text-left font-mono font-bold text-black text-xs pl-2 pt-1">
          Código: {codigoInterno}
        </div>
      )}
      <canvas
        ref={canvasRef}
        style={{ maxWidth: "100%", height: "auto", display: "block" }}
      />
    </div>
  );
}
