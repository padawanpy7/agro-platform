# Tu tabla de 16 filas, revisada contra lo investigado

Revisado el **25/09/2026**. Tres veredictos: **CONFIRMADO** (hay fuente), **SIN VERIFICAR** (se
busco y no aparecio), **CORREGIR** (lo encontrado dice otra cosa o cambia la conclusion).

## Lo que se confirma tal cual

| # | tu fila | veredicto |
|---|---|---|
| 2 | CAICA, JICA, fabrica de jugos, 114 ha de uva a 12.000-15.000 kg/ha | **CONFIRMADO** -- todo, salvo si la fabrica sigue operando hoy |
| 4 | Perdidas por clima; proteccion inviable por costo | **CONFIRMADO**, y es cita textual del presidente |
| 6 | No se encontro software de riego/turnos/acopio operando. Ausencia de evidencia, no evidencia de ausencia | **CONFIRMADO**, y tu matiz es el correcto |
| 7 | Satelite primero: gratis, cada 5 dias, cero capex | **CONFIRMADO** |
| 10 | Trampas al final, el mas caro de sostener | **CONFIRMADO**, y se refuerza: **no hay ningun dolor de plagas documentado en La Colmena**. No es solo caro, es que ahi no es el problema |
| 11 | Combinaciones fuertes | **CONFIRMADO** |
| 12 | Riego + trampas es vinculo debil, no venderla como sinergia | **CONFIRMADO** -- bien marcado |
| 13 | Arquitectura modular, una tabla de mediciones, reglas que declaran lo que necesitan | **CONFIRMADO** -- coincide con [design.md](../design.md) |
| 15 | `tenant_id` en hypertable, NO schema por tenant | **CONFIRMADO** -- identico a lo decidido en [design.md](../design.md) |
| 16 | No desarrollar firmware; comprar nodos comerciales | **CONFIRMADO** |

## Lo que hay que CORREGIR

### Fila 9 -- el modulo clima NO va tercero: va segundo, y quizas primero

Tu tabla lo pone tercero *"porque desbloquea mas reglas cruzadas que ningun otro por lo poco que
cuesta"*. Eso sigue siendo cierto, pero en **esta zona** hay una razon mas fuerte:

La prensa documenta **dos fallas opuestas** sobre el mismo cultivo: perdidas **por frio intenso** y
perdidas **por falta de invierno** ([detalle](05-clima-riesgos.md)). En carozo y vid, las **horas
de frio acumuladas** deciden si el año sirve, **y no se pueden ver mirando la planta**: cuando se
nota, ya paso.

**En La Colmena el clima no es un modulo de apoyo: es la variable del negocio.**

### Fila 8 -- el riego es el caballo de batalla, pero NO se sabe cual riego

Tu fila dice *"retorno medible en una temporada"*. Eso vale si el problema es **eficiencia**. Si el
problema es **reparto** -tu propia fila 3 lo dice-, entonces el producto no es el sensor de humedad:
es **medir y liquidar turnos**, o sea caudalimetro y planilla.

**No son el mismo producto ni el mismo precio.** Hasta no ver el sistema, el riego no se cotiza.

### Fila 1 -- la poblacion

Tu tabla dice **~7.000 habitantes**. El unico dato citable que se encontro es **5.234 del Censo
2002** ([Municipalidad](https://municipalidadlacolmena.gov.py/la-colmena/)). El CNPV 2022 ya
publico el cuadro por distrito pero no se pudo extraer el valor.

No es que tu numero este mal -puede ser una proyeccion correcta-. Es que **no tiene fuente citable**,
y en una presentacion eso es lo que se rompe primero. El resto de la fila -cultivos, "Capital de la
Fruta y la Miel", no es zona arrocera- **esta confirmado**.

## Lo que quedo SIN VERIFICAR

### Fila 3 -- el sistema de riego. **El vacio mas importante.**

Se busco en prensa, Municipalidad, JICA y documentos de recursos hidricos. **No hay ninguna fuente
publica** sobre el año, el origen japones, la gravedad, ni el "120 familias diseñadas / 400+ usando".

**Pero aparecio algo mejor, y esto si tiene fuente**: las cuencas de los arroyos **Rory y Rory-mi**
se administran por **una autoridad formada por los usuarios**, que gestiona tomas, represas y el
uso del agua potable y de riego -y es citada como **referencia de administracion eficiente**
([Municipalidad](https://municipalidadlacolmena.gov.py/la-colmena/)).

> **Si eso se confirma, es el hallazgo de toda la investigacion.** Una junta de usuarios que ya
> reparte turnos **es el cliente del modulo de riego**, y no es un productor: es una institucion.
> Vende distinto, cobra distinto y decide distinto.

### Fila 5 -- el atraso tecnologico y los drones

**No se encontro la declaracion sobre drones.** Lo que si esta documentado, y sirve igual o mas,
es que **las medidas de proteccion climatica son inviables por costo**.

Es un matiz importante para el pitch: no es que no adopten tecnologia por desconocimiento, es que
**ya evaluaron una y les dio que no cierra**. Van a evaluar la nuestra con el mismo criterio. **Hay
que ir con el numero, no con la promesa.**

## Lo que a tu tabla le FALTA

| | por que importa |
|---|---|
| **CAICA vende en el Mercado de Abasto y acopia tambien de NO socios** | el canal de entrada ya existe: no hay que convencer de a uno. Pero la cooperativa es **el portero** |
| **Dejaron el vino por la competencia importada y compiten por CALIDAD** | el incentivo esta alineado con medir. El pitch no es "produci mas", es "proba que tu fruta es mejor" |
| **Reclaman mejores precios** | quien produce premium sin poder probarlo cobra como commodity. **Verificarlo antes de usarlo** |
| **Expo Frutas es en diciembre, +50 feriantes, +10.000 visitantes** | **la ventana natural para mostrar el piloto andando esta a ~3 meses** |
| **Fecoprod, Itaipu, Yacyreta y SENATUR ya ponen plata ahi** | hay antecedente de financiamiento institucional para la zona |
| **El MIC fue citado como traba burocratica para reconocer productos** | dolor administrativo declarado, no agronomico. Puede ser otra puerta |
| **Intendente: Sergio Galeano (ANR)** | contraparte municipal |

## El stack: tu fila 14 contra lo que ya esta construido

Coinciden casi exacto con [design.md](../design.md): **Postgres + TimescaleDB + PostGIS, FastAPI,
Next.js**. Dos diferencias, ninguna grave:

- **ChirpStack** (tu tabla) no esta en el design. Es el servidor LoRaWAN, y **hace falta**: cuando
  el gateway deje de ser un puente crudo, algo tiene que gestionar sesiones y claves de los nodos.
  **Agregarlo al design.**
- **Expo offline** (tu tabla) contra el design, que dice **sin app movil en la fase 1** -el offline
  que importa es el del campo, no el del telefono-. Sigo pensando que el design tiene razon para la
  fase 1, pero **si el relevamiento se hace en finca sin señal, una app offline deja de ser opcional**.
  Preguntar si hay cobertura.
