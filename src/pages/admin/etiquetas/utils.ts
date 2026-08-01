export function generarEan13Interno(productoId: number): string {
  const base = `200${String(productoId).padStart(9, "0")}`;
  let suma = 0;
  for (let i = 0; i < 12; i++) {
    suma += parseInt(base[i]) * (i % 2 === 0 ? 1 : 3);
  }
  const check = (10 - (suma % 10)) % 10;
  return base + check;
}

export function validarEan13(codigo: string): boolean {
  if (!/^\d{13}$/.test(codigo)) return false;
  let suma = 0;
  for (let i = 0; i < 12; i++) {
    suma += parseInt(codigo[i]) * (i % 2 === 0 ? 1 : 3);
  }
  return (10 - (suma % 10)) % 10 === parseInt(codigo[12]);
}
