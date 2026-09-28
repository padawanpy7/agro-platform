# El plan real: fines de semana hasta diciembre, full time despues

**28/09/2026** (lunes). Restricciones que el dueño puso, y que cambian el plan mas que la plata:

| | |
|---|---|
| Disponibilidad | **sabado y domingo hasta la tardecita.** Entre semana trabaja en la ciudad |
| Proximo fin de semana | **ocupado, hay un evento** |
| **Diciembre 2026** | **renuncia y se dedica 100% al emprendimiento** |
| Lo que quiere | **tener ya algo andando cuando renuncie**, no arrancar de cero ese dia |

## La restriccion que reordena todo: la frecuencia de cosecha

El limite ya no es la plata ni la maquinaria. Es **cuantas veces por semana hay que estar**.

| cultivo | cada cuanto se cosecha | sirve solo en fin de semana? |
|---|---|---|
| **Sandia** | pasadas concentradas | **SI** |
| **Zapallo** | concentrada, y **aguanta guardado** | **SI** |
| **Maiz choclo** | concentrada | **SI** |
| **Mandioca / batata** | cuando quieras | **SI**, pero ciclo largo y poco valor |
| Locote | cada 3-5 dias | dudoso |
| **Tomate** | **cada 2-3 dias por 6 a 10 semanas** | **NO** |
| **Frutilla** | **cada 1-3 dias por meses** | **NO** |
| **Lechuga hidroponica** | por lotes, programable... | **NO, pero por otra razon**: si la bomba falla el lunes, el cultivo muere el martes |

> **Esto da vuelta mi propia recomendacion de ayer.** Habia puesto **frutilla primera** por valor por
> kilo y **tomate segundo** por ser el unico rendimiento medido. **Con la restriccion de fin de semana
> son los dos peores de la lista**, porque la cosecha no espera al sabado. El dato nuevo manda.

**Y el riego automatico es justamente lo que hace sobrevivible la ausencia de lunes a viernes.** Es
el unico trabajo de la lista que se puede delegar a una maquina: la cosecha, el atado y la carpida no.

> **La restriccion del dueño ES la demostracion del producto.** Si el cultivo se riega bien un martes
> sin que nadie este, eso es exactamente lo que hay que mostrarle al cliente -- y el cliente es el
> dueño del terreno, que perdio su arroz **por no poder controlar el riego**
> ([02-caica.md](02-caica.md)).

## Los fines de semana que hay, contados

Hoy es lunes **28/09/2026**. Descontando el fin de semana del evento:

| | fecha |
|---|---|
| ~~03-04/10~~ | **evento** |
| 1 | **10-11/10** |
| 2 | 17-18/10 |
| 3 | 24-25/10 |
| 4 | 31/10-01/11 |
| 5 | 07-08/11 |
| 6 | 14-15/11 |
| 7 | 21-22/11 |
| 8 | 28-29/11 |

**Ocho fines de semana, 16 dias, antes de diciembre.** Es poco para una hectarea y **alcanza de sobra
para 1.000 m2 instrumentados**.

> **Nota**: el dueño escribio *"de hoy 27/09"*, que fue **domingo**. Se asume que el fin de semana
> bloqueado es el del **03-04/10** y que el primer dia de campo es el **10-11/10**. **Si es al revés
> -- si el evento es el 10-11 -- todo el plan se corre un fin de semana**, y conviene confirmarlo.

## Elegir UN sitio, y es La Colmena

Hay **dos terrenos distintos** y el repo ya se equivoco una vez mezclandolos:

| | donde | que tiene | distancia |
|---|---|---|---|
| **Familiar** | Misiones (Santa Rita / Taturuguai, sin aclarar) | **un tajamar**, tierra propia | mas lejos |
| **Del contacto** | **La Colmena, Paraguari** | **120 ha, 130 cabezas, maquinaria prestada, y EL CLIENTE** | **~130 km de Asuncion** |

**Con 16 dias de campo no se atienden los dos.** Y La Colmena gana en todo lo que importa ahora: esta
mas cerca, la maquinaria es gratis, hay 120 ha de pasto para el satelite, y **ahi esta la unica
persona identificada que podria comprar el producto y que ya sabe del proyecto**.

**Recomendacion: concentrar todo en La Colmena y dejar Misiones en pausa.** El tajamar de Misiones es
una ventaja tecnica real, y no sirve de nada si no se puede llegar. Misiones vuelve cuando haya
tiempo, no antes.

## El plan, fin de semana por fin de semana

### 10-11/10 -- el primer dia de campo: preguntar y medir, no comprar

**No se compra nada todavia.** Lo que se hace:

- [ ] Las **seis preguntas** de [09-oferta-tierra-maquinaria.md](09-oferta-tierra-maquinaria.md).
- [ ] **Caminar el terreno y elegir el pedazo mas ALTO**, no el mas comodo. El suelo no drena: 20 cm de
      diferencia de cota deciden el cultivo.
- [ ] **Sacar muestras de suelo** para el analisis del IPTA. Es lo que mas tarda en volver, asi que va
      el primer dia.
- [ ] **Hay electricidad? De que tipo?** Bloqueante para hidroponia y define la bomba.
- [ ] **Que maquinaria tiene exactamente**, y si los implementos sirven para camellones.
- [ ] **Sacar el poligono del terreno y de los potreros** con el GPS del telefono. Es lo que el NDVI
      necesita y **no requiere comprar nada**.
- [ ] Dejar dicho **de quien es la cosecha**.

### Entre semana, desde la ciudad -- lo que NO necesita estar ahi

- [ ] **NDVI de las 120 ha por Sentinel-2.** Gs 0, es software, y es **el regalo con el que se vuelve
      el fin de semana siguiente**. Ver [10-plan-con-12-millones.md](10-plan-con-12-millones.md).
- [ ] Cotizar goteo, bomba y filtro para 1.000-2.000 m2.
- [ ] Armar el controlador y los sensores en la mesa de casa. **Todo el Nivel 0 se prueba en un balde**
      antes de ir al campo.

### 17-18 y 24-25/10 -- construir

- [ ] **Camellones** con el tractor prestado, **y sólo con el suelo a punto** -- nunca en humedo: en
      arcilla pesada eso destruye la estructura por años.
- [ ] Instalar goteo, bomba y filtro.
- [ ] **Sensor de humedad enterrado y el controlador andando**, con la valvula.
- [ ] **Sembrar sandia directa** (ventana septiembre-octubre, ~85 dias).

### 31/10 a 29/11 -- que el sistema pase la prueba de la semana

- [ ] Cada fin de semana: **revisar que el riego ocurrio sin nadie**, y por que decidio lo que decidio.
- [ ] Arreglar lo que falle. **Esta es la fase que de verdad importa**: un sistema que aguanta cinco
      dias solo es el producto.
- [ ] Cosecha de sandia **hacia diciembre**, justo cuando se libera el tiempo.

### Diciembre -- renuncia, y ya hay algo andando

Lo que deberia existir ese dia:

1. **Un sistema de riego autonomo funcionando** en terreno de un cliente real, con dos meses de
   historico.
2. **Una cosecha** de sandia entrando.
3. **Un mapa de pasturas** de las 120 ha, entregado.
4. **El suelo caracterizado** con analisis del IPTA.
5. **La relacion construida** con el unico cliente posible identificado.

**Eso es "tener algo que hacer al renunciar": no un campo vacio, sino un sistema andando y un cliente
mirandolo.**

### 2027 -- lo que se planta recien con dedicacion completa

| | cuando | por que no antes |
|---|---|---|
| **Tomate** | ciclo con presencia diaria | cosecha cada 2-3 dias |
| **Frutilla** | **plantacion febrero-mayo** | la ventana **se abre despues de diciembre**, sola |
| **Lechuga hidroponica** | desde diciembre | muere en horas si falla la bomba |

Los tres, evaluados: [economia/hidroponia.md](../economia/hidroponia.md) y
[economia/frutilla.md](../economia/frutilla.md).

## Lo que puede tirar abajo este plan

1. **Que el fin de semana del evento sea el 10-11 y no el 03-04.** Corre todo una semana.
2. **Que no haya un pedazo alto.** Si todo el terreno es bajo, se replantea: hidroponia bajo cubierta
   pasa a ser la unica salida ahi, y eso es diciembre.
3. **Que no haya electricidad.** No frena la sandia ni el goteo por gravedad desde un tanque; si frena
   la hidroponia.
4. **Que la sandia no cierre con el suelo.** Por eso conviene partir la parcela en dos cultivos
   ([10-plan-con-12-millones.md](10-plan-con-12-millones.md)).
