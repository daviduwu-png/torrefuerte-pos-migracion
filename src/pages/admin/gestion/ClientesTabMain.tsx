import DirectorioClientes from "./clientes/DirectorioClientes";

export default function ClientesTab() {
  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-300 h-full min-h-0">
      <div className="flex-1 min-h-0 flex flex-col">
        <DirectorioClientes />
      </div>
    </div>
  );
}
