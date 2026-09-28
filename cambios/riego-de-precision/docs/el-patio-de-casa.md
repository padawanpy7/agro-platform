# El patio de casa: lo que hay, donde va cada cosa, y que se optimiza

**28/09/2026.** Relevamiento del sitio del banco de pruebas, que ahora es la casa
([banco-de-pruebas.md](../banco-de-pruebas.md)).

## Lo que hay

| | |
|---|---|
| **Tanque de agua grande** | **en pleno sol** |
| **Electricidad y WiFi** | **de sobra** |
| **Patio grande** | si |
| **Techo armable (carpa)** | si, **ya lo tiene** |
| **Sol** | **todo el dia en una parte**; un **arbol** da sombra a la otra mitad |
| Todo lo demas | **nada. Se arma desde cero** |

**Es mas de lo que hace falta para arrancar.** El techo armable y la electricidad son las dos cosas
que normalmente hay que comprar, y ya estan.

## La decision del arbol: no lo eches

El dueño planteo **echar el arbol y poner la carpa ahi**. **Recomendacion: no.** Cuatro razones, en
orden de peso:

1. **La sombra es lo que mas falta.** Arriba de **24 °C de solucion la lechuga se espiga**, y de octubre
   a marzo es la temporada caliente. **El arbol ya esta resolviendo gratis el problema numero uno.**
2. **Un arbol enfria por transpiracion, una carpa no.** El arbol no solo tapa la luz: **evapora agua y
   baja la temperatura del aire varios grados**. Una carpa tapa la luz y **atrapa el calor**: sin
   ventilacion, debajo puede estar **mas caliente** que a cielo abierto.
3. **Es irreversible.** La carpa se arma en un dia. El arbol tardo años.
4. Seria **sacar el activo para reemplazarlo por algo peor, y pagando.**

### Donde va cada cosa, entonces

| | donde | por que |
|---|---|---|
| **Las plantas** | **sol de la mañana, sombra despues del mediodia** | el sol de la tarde -- despues de las 13:00 -- es el que quema; el de la mañana es el que produce. **Exposicion al este** |
| **El tanque de la solucion** | **la sombra mas profunda: debajo del arbol** | es donde la inercia termica trabaja a favor |
| **La carpa** | **sobre las plantas, en la parte de sol** | su trabajo es **tapar la lluvia y sostener la media sombra** -- no reemplazar al arbol |

### Y antes de decidir: medilo. Son dos sensores

> **Estas construyendo una plataforma de agricultura de precision. No cortes un arbol por una
> corazonada: la primera decision que tu propio sistema deberia tomar es donde poner los canteros.**

Dos baldes de agua con un **DS18B20** cada uno, una semana, logueando: **uno en la parte de sol, otro
debajo del arbol.** Al final de la semana tenes la diferencia real en grados, a la hora que importa
(15:00), en tu patio y no en un paper.

**Eso cuesta dos sensores y contesta la pregunta sin romper nada.** Y de paso es el primer dato de la
serie historica.

## El tanque: buena intuicion, con una correccion

**La intuicion es correcta**: un tanque grande en sombra es **el control de temperatura mas barato que
existe**. La inercia termica es gratis -- mas volumen, menos oscilacion -- y le gana a cualquier
enfriador que entre en este presupuesto.

**La correccion: NO uses el tanque domestico como reservorio de la solucion nutritiva.** Ni nutrientes
en el agua de la casa, ni agua de la casa que dependa del sistema. **Tanque aparte para la solucion**,
lo mas grande que entre, a la sombra.

**Pero el tanque que ya tenes, en pleno sol, sirve para algo ahora mismo**: medile la temperatura del
agua a las 15:00. **Es la vista previa gratis de lo que le va a pasar a tu solucion en ese patio.**

## Que se optimiza: un solo numero, y no tres

El dueño dijo *"mas peso, mejor calidad, menor tiempo, etc."*. **Las tres cosas a la vez no son un
objetivo: son tres objetivos, y un lazo con tres objetivos no converge -- oscila.**

**Pero hay un numero que las contiene a las tres:**

```
                    Gs por m2 por mes
```

| lo que queres | como entra en ese numero |
|---|---|
| **Mas peso** | mas kilos -> mas Gs |
| **Mejor calidad** | mejor precio por unidad -> mas Gs |
| **Menos tiempo** | mas ciclos por año -> mas Gs **por mes** |

> **Es un solo numero, es el que se puede medir sin discusion, y es el mismo que le importa al negocio.
> Optimizar Gs/m2/mes es optimizar exactamente lo que queres.**

**Y necesita pisos, porque una metrica sola se puede hacer trampa.** Cosechar chico y verde da mas
ciclos por año y **peor negocio**. Entonces, como restriccion y no como objetivo:

- **Vendible**: si no la compra un cliente, no cuenta, aunque pese.
- **Sin espigar**: la espigada no se vende a ningun precio.
- **Sin perder el lote**: un ciclo perdido borra la ganancia de tres buenos.

**Cualquier configuracion que viole un piso queda descalificada, por mas Gs/m2/mes que muestre.**

## "Agricultura de precision llevada al limite": si, y por una razon concreta

No es una frase. **Un patio con tanque, techo y sensores es el unico lugar donde se controlan TODAS las
variables.** En un lote hay clima que no se puede cambiar; aca la temperatura de la solucion, la luz, el
pH y la EC **son todas manipulables**.

**Por eso se aprende mas rapido aca que en el campo, y por eso este es el primer sistema.** Lo que se
aprenda en el patio baja al campo; al revés no.

## Empezar solo en la casa: si, con dos excepciones que salen gratis

**Si. Es la decision correcta para octubre y noviembre**, y por una razon dura: **el sistema tiene que
funcionar en algun lado antes de ir a la tierra de un cliente.** Llevar un sistema a medio depurar a La
Colmena gasta el activo mas valioso que hay, que es la relacion.

**Y presencia diaria en la casa contra dos dias por mes en el campo es diez veces la velocidad de
iteracion.**

**Las dos cosas de La Colmena que NO conviene postergar, porque no cuestan casi nada:**

| | costo | por que ahora |
|---|---|---|
| **NDVI de las 120 ha** | **Gs 0**, es software y se hace desde la ciudad | mantiene la relacion caliente **sin construir nada**, y es un regalo real |
| **Una visita, un sabado** | el viaje | las preguntas de [colmena/02-caica.md](../colmena/02-caica.md), sobre todo **el precio en finca al capataz** |

**El tomate y la sandia en La Colmena se corren a cuando el sistema funcione.** Y no se pierde nada: el
señor y el capataz no se van a ningun lado, el almacigo de tomate llega hasta diciembre y el melon se
siembra hasta febrero.

> **La Colmena recibe un mapa y una conversacion. La construccion es en casa.**

## "Una automatizacion diferente para cada una": exacto, y es el diseño

Eso es **bloques**, y es justo el metodo de
[como-aprender-de-cada-ciclo.md](como-aprender-de-cada-ciclo.md). Con patio grande entran **4 a 6
bloques**, cada uno con su rele, su valvula o su bomba, y **una sola variable distinta**.

**Cuesta mas hardware y es exactamente en lo que hay que gastarlo**: seis reles baratos que dan
atribucion valen mas que un sistema caro que no la da.

## Lo que falta

- **Cuantos m2 tiene el patio**, y cuantos de la parte con sol de mañana. Fija cuantos bloques entran.
- **La semana de medicion sol contra arbol.** Es lo primero, y decide la traza.
- **Cuantos litros tiene el tanque que ya esta**, y de que material -- el plastico negro al sol es lo
  peor, el blanco refleja.
- **A que temperatura llega el agua del tanque actual a las 15:00.** Un termometro, hoy.
- **Que tan grande es la carpa** y si tiene ventilacion arriba. Sin salida de aire caliente, una carpa
  cerrada en verano cocina.
