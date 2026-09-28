# Que plantar en Misiones con un tajamar, ordenado por precio por hectarea

Armado el **28/09/2026**, a pedido del dueño: *tengo un tajamar en Misiones; que se puede plantar
ahi segun la zona, por orden de precio por hectarea*.

**La lista esta abajo. Pero la respuesta corta es que el precio por hectarea NO es el criterio que
decide aca**: el tajamar tiene un volumen finito, y lo que decide es **cuanta plata sale de cada
metro cubico de agua**. Las dos listas no dan el mismo orden, y la segunda es la que importa.

## 1. La lista por precio por hectarea, con el filtro de Misiones

Los brutos por hectarea salen de esta carpeta; lo que es **estimado** o **no calculable** va marcado,
igual que en los archivos de origen. El filtro de zona sale de que Misiones tiene **heladas
documentadas** y **terrenos bajos y humedos** ([banco-de-pruebas.md](../banco-de-pruebas.md)).

| # | cultivo | bruto/ha | en Misiones |
|---|---|---|---|
| 1 | **[Frutilla](frutilla.md)** | **no calculable** -- falta rendimiento. Precio de Gs 20.000 a 120.000/kg | **SI**, y el frio del sur **ayuda** |
| 2 | **[Tomate](tomate.md)** | **Gs 231 M/zafra** (el unico **medido**: 30.475 kg/ha) | **SI**, con reparo de helada |
| 3 | [Uva](uva.md) | ~Gs 198 M (**estimado**) | **condicional**: exige suelo drenado y **3-4 años** hasta producir |
| 4 | [Carozo](carozo.md) | **no calculable** | **SI por clima** -- Misiones es lo mas frio del pais y el carozo **necesita** horas de frio. Sin numero |
| 5 | [Banana](banana.md) | ~Gs 52 M (**estimado**) | **NO**: la helada la mata. Por eso esta en Caaguazu |
| 6 | [Locote](hortalizas-varias.md) | Gs 50 M, pero es **rentabilidad, no bruto** -- no compara | SI |
| 7 | [Citricos](citricos.md) / [Piña](pina.md) | **no calculable** | citricos si; **piña NO**, no aguanta helada |
| 8 | [Arroz](arroz.md) | ~Gs 20 M | **es EL cultivo de la zona, y con tajamar NO se puede.** Ver §3 |
| 9 | Soja | ~Gs 9,9 M | se puede, y no vale la pena |
| 10 | [Ganaderia](ganaderia.md) | ~Gs 3,1 M | es el uso actual del tajamar: bebedero |

**Las heladas en Misiones no son hipoteticas**: hay escarcha registrada sobre pastizales en San Juan
Bautista, y prensa documentando **heladas que golpearon la produccion horticola y las pasturas** del
departamento ([Ultima Hora](https://www.ultimahora.com/misiones-heladas-golpean-la-produccion-horticola-y-pasturas-pero-suelo-humedo-mitigo-danos-mayores),
[ABC](https://www.abc.com.py/clima/2026/07/07/frio-extremo-en-paraguay-hubo-heladas-en-casi-toda-la-region-oriental-y-parte-del-chaco/)).

> Y ahi hay una vuelta de tuerca: **el frio que mata la banana es el que habilita el carozo y la
> uva.** Las horas de frio son un requisito, no un riesgo, en durazno, ciruela y vid. Misiones esta
> del lado bueno de esa moneda.

## 2. La lista que de verdad decide: plata por metro cubico de agua

Un tajamar no da hectareas, da **metros cubicos**. Entonces la pregunta no es *cuanto rinde una
hectarea* sino *cuanto rinde el agua que tengo*.

**Los consumos, con fuente:**

| | agua | fuente |
|---|---|---|
| Horticultura | **4.000 a 6.000 m3/ha/año** | [Manual de captacion y almacenamiento, Chaco Central (CONACYT)](https://www.conacyt.gov.py/sites/default/files/upload_editores/u454/MANUAL-SISTEMAS-CAPTACIon-ALMACENAMIENTO-AGUA-CHACO.pdf) |
| Arroz | por **inundacion**. La ley paraguaya exige un reservorio de **1 ha de 1,20 m por cada 10 ha** de arroz, o sea **1.200 m3/ha solo de RESERVA** | [El Surtidor](https://elsurti.com/futuros/reportaje/2022/06/23/la-sed-del-arroz-en-paraguay/) |

**La cuenta, y esta hecha a favor del arroz a proposito:**

| cultivo | bruto/ha | agua/ha | **Gs por m3** |
|---|---|---|---|
| **Tomate** | Gs 231 M | 4.000-6.000 m3 | **Gs 38.500 a 57.750** |
| Arroz | Gs 20 M | **1.200 m3** (solo la reserva legal) | **Gs 16.667** |

> **El tomate saca 2 a 3,5 veces mas plata del mismo metro cubico que el arroz -- y eso contando del
> arroz SOLO el agua de reserva que la ley obliga a guardar, no la que realmente consume
> inundando.** Con el consumo real, que es varias veces la reserva, la diferencia pasa a ser de un
> orden de magnitud.

**Consecuencia: con un tajamar, el arroz esta afuera.** No por rentabilidad: por volumen. Inundar
una hectarea agota el tajamar y el arroz de la zona no se riega con tajamares, se riega **bombeando
de rio o arroyo** -- el 99% del arroz paraguayo se hace asi, con taipas y bomba en el cauce.

**Y da vuelta el criterio del pedido**: tener agua limitada es un argumento **a favor** de los
cultivos de arriba de la lista, no de los de abajo. Poca agua + mucho valor por hectarea = poca
superficie, mucha plata. **Una hectarea de tomate bruta lo que 74 hectareas de ganaderia**
(231 / 3,1).

## 3. El numero que no esperaba: la evaporacion se come el tajamar

Perdida medida en tajamares: **4,6 mm/dia en invierno y 9,6 mm/dia en verano**. Para un tajamar
tipico de **5.000 m2 de espejo**, eso son **48 m3 por dia** -- 48.000 litros al aire
([Productiva](https://www.productivacm.com/archivos/17046)).

Un ejemplo con numeros redondos, **para dimensionar, no como medicion del tajamar del dueño**:

```
Tajamar de 5.000 m2 x 1,5 m           =  7.500 m3
Evaporacion en 90 dias de verano
  (9,6 mm/dia x 5.000 m2)             = -4.320 m3   <-- el 58% del tajamar
Riego de 2 ha de tomate en un veranico
  (~20 dias x 5 mm/dia = 100 mm)      = -2.000 m3
                                        ----------
                                          1.180 m3 para el ganado, y nada mas
```

> **Le podes perder mas agua al sol que al cultivo.** Y de ahi sale el criterio de diseño: un
> tajamar **hondo y chico de espejo** conserva mucho mas que uno **ancho y playo** con el mismo
> volumen, porque la evaporacion se paga por metro cuadrado de superficie, no por metro cubico
> guardado.

**Y de ahi sale el primer sensor del banco de pruebas, que no es el de humedad de suelo: es el
NIVEL DEL TAJAMAR.** Un ultrasonico con LoRa es barato, ya estaba propuesto para ganaderia
([ganaderia.md](ganaderia.md) §1), y en Misiones contesta la pregunta que de verdad limita todo:
**cuanta agua queda, y a que velocidad se va.** Sin ese dato, "cuantas hectareas puedo regar" no se
puede contestar.

## 4. La recomendacion

**Frutilla y tomate, en poca superficie, con el tajamar reservado para el veranico.**

- **Tomate** es el unico bruto por hectarea **medido** de toda la carpeta, y encaja con riego por
  goteo, que es el producto.
- **Frutilla** tiene el precio por kilo mas alto y **raiz superficial** -- o sea, la mas sensible al
  estres hidrico y la que mas gana con riego frecuente. Ademas el precio se mueve **6x** dentro de la
  temporada segun cuando entres, y eso lo predicen los grados-dia.
- **El arroz queda afuera con tajamar**, aunque sea el cultivo de la zona.
- **La banana queda afuera por la helada**, aunque su bruto la pondria quinta.

## 5. Lo que falta, y sin esto la lista no se convierte en un plan

1. **Cuantos m3 tiene el tajamar** -- espejo en m2 y profundidad. Es el dato que fija **cuantas
   hectareas**, y ningun cultivo de la lista lo cambia.
2. **El terreno es alto o bajo? Se inunda?** Es LA pregunta en Misiones y sigue sin contestar
   ([banco-de-pruebas.md](../banco-de-pruebas.md)). Si es bajo, la uva y el carozo salen de la lista
   -- **no aguantan raiz encharcada**, y no hay riego que arregle eso.
3. **Cuantas hectareas tiene el terreno.**
4. **Se seca el tajamar en una seca fuerte?** Si se seca, no es fuente de riego: es bebedero.
5. **El rendimiento de frutilla en Paraguay**, que falta en toda la carpeta y es lo que impide
   ponerla primera con un numero en vez de con una presuncion.
6. **Santa Rita o Taturuguai?** `banco-de-pruebas.md` dice que el terreno familiar esta en
   **compañia Santa Rita**; el dueño menciono **Taturuguai** (compañia de San Ignacio) como la zona
   del terreno del abuelo. **Pueden ser dos terrenos distintos.** Sin aclarar esto,
   [tierra.md](tierra.md) esta atado a la zona equivocada.
