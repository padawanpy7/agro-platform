# Hortalizas varias: papa, cebolla, zanahoria, locote

Los acompañantes del tomate. **Ninguno justifica una venta por si solo**; todos suben el valor de
un cliente que ya tiene el sistema puesto.

| cultivo | superficie | precio mayorista (25/09/2026) | por kilo |
|---|---|---|---|
| **Cebolla** | **962 ha** (MAG 2020) | Gs 8.000 la docena (de hoja) | s/d |
| **Zanahoria** | **750 ha** (MAG 2020) | Gs 60.000 la bolsa de 20 kg | **Gs 3.000** |
| **Papa** | **487 ha** (MAG 2020) | Gs 150.000 la bolsa de 20 kg | **Gs 7.500** |
| **Locote** (pimiento verde) | dentro de las ~3.500 ha de horticultura | Gs 7.000 el kilo | **Gs 7.000** |

Fuentes: [ARGENPAPA/MAG](https://www.argenpapa.com.ar/noticia/10036-paraguay-la-horticultura-inyecto-al-campo-us-51-6-millones),
[preciosdelagro](https://preciosdelagro.com/).

**Dato de rentabilidad encontrado**: el locote puede llegar a **Gs 50 millones por hectarea** de
rentabilidad ([ABC](https://www.abc.com.py/articulos/hortalizas-dejan-buenas-ganancias-a-productores-210178.html)).
**Es rentabilidad, no bruto** -- no se compara con los Gs 231 M de bruto del tomate.

**En 2025 la papa y la cebolla tuvieron un desempeño excepcional** en La Colmena
([InfoNegocios](https://infonegocios.com.py/infoagro/uvas-premium-ganan-espacio-en-la-colmena-con-rendimientos-de-hasta-15-000-kg-por-hectarea)).

## Por que importan igual

**El mismo cliente rota cultivos.** Un horticultor de 3 ha no siembra solo tomate: rota con locote,
cebolla y papa segun la epoca. **El sistema instalado sirve para todos** -- lo que cambia son los
umbrales, no el hardware.

Eso refuerza la decision de [design.md](../design.md): **`campania` es una tabla aparte**, porque el
cultivo cambia y la parcela no. Si el cultivo fuera una columna de la parcela, rotar obligaria a
reescribir el historico.

**Veredicto: no se venden solos, pero multiplican el valor del sistema ya instalado.** Y son la
razon por la que el modelo de datos separa parcela de campaña.
