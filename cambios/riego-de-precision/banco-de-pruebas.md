# El banco de pruebas: Misiones

**Decidido el 27/09/2026.** El terreno familiar en **Misiones** (compania Santa Rita) se usa como
**banco de pruebas**, no como piloto comercial. Son dos cosas distintas y conviene no mezclarlas:

| | que prueba | donde puede ser |
|---|---|---|
| **Banco de pruebas** | que el **software** funciona de punta a punta | cualquier lado; un patio sirve |
| **Piloto comercial** | que **alguien paga**, con una referencia mostrable | el lote de un cliente |

Tierra propia es **ideal para el primero** -se puede romper, iterar y equivocarse sin costo de
relacion- y **floja para el segundo**: prueba que la tecnologia anda, no que alguien la compra.

> **NOVEDAD del 28/09/2026, y cambia el alcance de este documento.** El dueño planteo que *"a lo
> mejor"* hace **su propia plantacion piloto** en el terreno. Si eso pasa, esto deja de ser solo un
> banco: **el primer productor es el dueño**.
>
> **Lo que gana**: el producto entero probado sin convencer a nadie, y el **historico propio** que el
> ML necesita y que hoy no existe. **Lo que sigue sin probar es lo mismo que antes**: que alguien
> pague. Un piloto propio no es una referencia comercial -- sigue siendo tierra propia.
>
> La fila de arriba que dice "sin cliente, sin presion" **deja de ser cierta** si hay una plantacion
> real adentro: una cosecha propia si mete presion, y el software que decide el riego pasa a tener
> plata en juego. La inversion y la maquinaria estan costeadas en
> [economia/inversion-inicial-tomate.md](economia/inversion-inicial-tomate.md); el efecto sobre quien
> es el cliente, en [PREGUNTAS.md](PREGUNTAS.md) pregunta 0.

## EL BANCO SE MUDA: del terreno de Misiones al patio de la casa (28/09/2026)

**Este documento eligio Misiones, y con la informacion de hoy esa eleccion ya no se sostiene.** Lo que
cambio: el dueño solo puede ir al campo **sabado y domingo**, y va a montar **hidroponia en su casa**.

**La tabla de arriba dice, textual, que el banco puede estar en "cualquier lado; un patio sirve".**
Aplicada en serio, esa frase manda el banco a la casa:

| | Misiones | **el patio de la casa** |
|---|---|---|
| Cuanto se lo mira | **dos dias por mes**, con suerte | **todos los dias, 24/7** |
| Que instrumenta | humedad de suelo, valvula | **EC, pH, temperatura de solucion, nivel, caudal, bomba** |
| Cuando se ve una falla | **el fin de semana siguiente** | **el mismo dia** |
| Viaje | si, y lejos | **cero** |

**Un banco que se mira dos dias por mes no es un banco: es un experimento abandonado entre visitas.** Y
la hidroponia **exige mas instrumentacion que la tierra** -- en tierra el sensor es una mejora, en
hidroponia el sensor **es** el cultivo --, o sea que ejercita mas software, no menos.

> **Decision: el banco se hace en la casa.** Misiones sale del plan, y **no por el tajamar** -- que
> sigue siendo una ventaja tecnica real -- **sino porque ya no hace falta y no se puede atender**.
> Vuelve cuando haya tiempo, no antes.

**De tres sitios a dos**: el **banco en la casa** (entre semana) y el **piloto con cliente en La
Colmena** (fines de semana). Ver
[colmena/11-plan-por-fines-de-semana.md](colmena/11-plan-por-fines-de-semana.md) y
[economia/hidroponia.md](economia/hidroponia.md).

**Lo que sigue valiendo de todo lo de abajo**: el analisis de por que en Misiones no se vende ahorro de
agua sino **el veranico y la saturacion**. Ese argumento es **de la zona, no del banco**, y sigue en pie
para el dia que se plante ahi.

## Lo que Misiones tiene, y por que importa

| | dato | fuente |
|---|---|---|
| Geografia | **terrenos bajos y humedos**, planicies con ondulaciones y **abundancia de agua**. Regado por el Parana y el Tebicuary | [Portal Guarani](https://www.portalguarani.com/detalles_museos_otras_obras.php?PqwoiflUYTeslk=OTk0) |
| Lluvia | **1.300 a 1.800 mm anuales**, abundantes todo el anio | [DINAC / Clima de Paraguay](https://es.wikipedia.org/wiki/Clima_de_Paraguay) |
| Temperatura | verano ~26 C, invierno ~16 C | idem |
| Heladas | **suaves, ~1 dia al anio**, entre junio y agosto | idem |
| Arroz | **57.335 ha**: la mayor superficie del pais | [Base IS](https://www.baseis.org.py/wp-content/uploads/2022/03/2021_Dic-Produccion-de-arroz-en-Py.pdf) |
| Cultivos del departamento | soja, **cebolla**, arroz, **papa**, ensayos de trigo | [Portal Guarani](https://www.portalguarani.com/detalles_museos_otras_obras.php?PqwoiflUYTeslk=OTk0) |
| Ganaderia | San Juan Bautista es **"localidad ganadera y agricola"** | idem |

## Lo que esto CAMBIA en el argumento

**Misiones no es zona de escasez de agua.** Es lo contrario: terrenos bajos, humedos, con abundancia
de agua y 1.300-1.800 mm. Por eso ahi funciona el arroz, que se riega por inundacion.

**Consecuencia directa: en Misiones NO se vende ahorro de agua.** El argumento que sirve en La
Colmena o en el Chaco aca no pega, y usarlo seria vender humo.

**Lo que si se vende ahi, y es igual de real:**

1. **Cuando NO regar.** Con lluvia abundante, el error caro es el exceso: en tomate el exceso raja
   la fruta y pudre la raiz. Un sensor que dice "no riegues, el suelo esta en capacidad de campo"
   vale lo mismo que uno que dice "rega".
2. **El veranico.** 1.500 mm mal distribuidos siguen matando: veinte dias secos en pleno cuaje
   hacen el dano igual. **Abundancia anual no es disponibilidad en el momento justo**, y esa
   diferencia solo se ve midiendo.
3. **Saturacion y drenaje.** En terreno bajo el problema puede ser que el agua no se va. El mismo
   sensor lo detecta, y es un dato que hoy nadie tiene.

**Y una ventaja que no se ve de entrada**: Misiones es zona arrocera, o sea que **ahi hay cultura de
riego**. La gente entiende de agua, de turnos y de bombas. No hay que explicar el concepto.

## Que se planta en el banco

**Tomate, en camellon elevado.** Tres razones:

1. **Toda la economia del proyecto esta calculada sobre tomate** -Gs 231 M/ha, la cuota al 1%, el
   4,8x de una mejora del 5%-. Plantando tomate, **el dato del banco es directamente comparable**
   con lo escrito. Con cualquier otro cultivo hay que rehacer las cuentas.
2. **Ciclo de ~120 dias**: una temporada da el ciclo completo.
3. **Es de los mas sensibles al agua en las dos direcciones** -falta y exceso-, que es justo lo que
   hay que demostrar en una zona humeda.

**El camellon elevado no es opcional en terreno bajo**: es como se planta ahi, y ademas separa el
efecto del riego del efecto del encharcamiento.

**Mas un cantero chico de hoja** (lechuga, rucula): ciclo de 30-45 dias, o sea **tres vueltas de
validacion del software mientras el tomate hace una**. Es la forma mas rapida de encontrar bugs.

**Lo que NO se planta aca**: sandia o melon (un ciclo, mucho espacio, poco dato), frutilla
(agronomia exigente: se estarian depurando dos cosas a la vez), y nada de arroz ni soja.

> **Papa y cebolla** son los cultivos horticolas que el departamento ya hace, y la papa se paga
> Gs 7.500/kg mayorista, casi como el tomate. **Si el objetivo fuera demostrarle al vecino** en vez
> de validar el software, la papa seria mejor eleccion. Para el banco, gana el tomate por
> comparabilidad.

## Lo que falta saber del terreno

Ninguna es sobre el cultivo. Son las que deciden si se puede:

- Cuanto mide? Para un banco alcanzan **100 a 200 m2**.
- **Es bajo o alto? Se inunda?** En Misiones esta es LA pregunta.
- Tiene desague o se encharca?
- Tiene agua: pozo, arroyo, tanque, canilla? **Con que presion?**
- Hay electricidad?
- **Hay senial de celular?** Define si el gateway manda o acumula.
- **Hay alguien ahi dia a dia?** Un banco sin nadie que mire se muere solo. **Suele ser el cuello
  real, mas que el agua o el cultivo.**
- Esta trabajado o en descanso?
- A que distancia esta de donde vivimos? Si son 4 horas, cada iteracion cuesta un dia.

## NO hay convergencia con el contacto ganadero (corregido el 27/09)

Se habia anotado que el contacto de las 130 cabezas podria estar cerca del banco. **Es falso: el
señor es de La Colmena (Paraguari)**, a unos 200 km de Misiones.

O sea que son **dos frentes separados y hay que tratarlos como tales**:

| | donde | que es |
|---|---|---|
| **Banco de pruebas** | Misiones, terreno familiar | valida el **software**. Sin cliente, sin presion |
| **La Colmena** | Paraguari | donde esta el **cliente posible** y la cooperativa |

**No se pueden cubrir con un viaje ni con un gateway.** Y esta bien que sea asi: el banco no
necesita cliente y el cliente no necesita esperar al banco.
