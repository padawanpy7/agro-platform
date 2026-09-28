# Como aprender de cada ciclo: por que loguear todo SI y automatizar todo de una NO

**28/09/2026.** Planteo del dueño, y es bueno: *"no se puede loguear y automatizar todo de una vez? es
como un ML manual, si se muere mi planta es ver su serie de datos y ver por que y ajustar para el
siguiente hasta tener la confirmacion optima"*.

**La intuicion es correcta y el lazo es el correcto.** Lo que falla no es la idea: es **una cuenta y
una atribucion**. Y la respuesta honesta no es "andá despacio" -- es **"paralelizá en vez de
serializar"**.

## Donde el planteo tiene razon, sin peros

**Loguear todo, a resolucion completa, desde el dia uno. Si. Sin excepciones.**

No hay contra. Es literalmente la **regla 1 del contrato** de este proyecto: el dato se guarda crudo y
calibrado, con la hora de medicion y la de llegada, **porque un dato mal guardado no se arregla
despues**. Loguear de menos hoy es un experimento que no se puede repetir.

**Y automatizar la MEDICION entera, ya.** Medir no puede matar la planta. Ahi no hay que graduar nada.

## Donde se rompe: si automatizas seis acciones juntas y la planta muere, tenes seis sospechosos

Esta es la unica objecion de fondo, y no es sobre riesgo: es sobre **atribucion**.

```
Automatizo riego + pH + EC + sombra + aireacion + temperatura, todo junto.
La planta muere.
La serie muestra seis variables que se movieron.
                  -> No hay forma de saber cual la mato.
```

**No hay contrafactico.** No existe la version de ese mismo ciclo, con ese mismo clima y esa misma
agua, en la que sólo una cosa fue distinta. **El ciclo se gasto y no enseño nada**, y gastar un ciclo
es gastar 45 dias.

> **La asimetria que ordena todo: medir no puede matar la planta, actuar si.** Un sensor mal calibrado
> que solo loguea te cuesta un numero malo. Una dosificadora que **actua** sobre ese numero malo te
> cuesta el cultivo, el experimento **y** los 45 dias.

## La otra cuenta: 45 dias por iteracion no es ML, es agronomia

| | |
|---|---|
| Ciclo de lechuga | **40 a 45 dias** |
| Iteraciones por año, si se aprende una cosa por ciclo | **8** |
| Iteraciones que necesita un modelo de verdad | **cientos a miles** |

**"Ajustar para el siguiente" a 45 dias por vuelta da ocho experimentos al año.** Eso no es machine
learning: es **mejora agronomica**, y la mejora agronomica se mide en años. El lazo esta bien; **el
reloj es brutal.**

## Y aca esta la salida, que es mejor que ir despacio: BLOQUES

**No hay que gastar un ciclo por pregunta. Se pueden hacer varias preguntas en el mismo ciclo.**

```
Un sistema de 200 plantas, partido en 4 bloques de 50.
Cada bloque con UNA cosa distinta. Mismo clima, misma agua, misma semana.

  Bloque A: EC 1,2      Bloque B: EC 1,6
  Bloque C: con sombra  Bloque D: sin sombra

45 dias  ->  4 respuestas, no 1.
Un año   ->  32 comparaciones, no 8.
```

**Y cada comparacion es mas limpia que las de ciclos distintos**, porque el clima, el agua y la semana
son los mismos. Comparar el ciclo de octubre contra el de diciembre mezcla la variable que cambiaste
con el verano entero.

> **La forma de ir mas rapido no es automatizar mas cosas a la vez: es correr mas bloques a la vez.**
> Mismo tiempo, misma plata, cuatro veces mas aprendizaje -- y con atribucion limpia.

**Con presencia diaria en la casa esto es perfectamente hacible**, y es lo que cambia la
recomendacion: automatizar las acciones **por bloque**, para que cada una quede atribuible.

## Lo que casi todos se olvidan de loguear, y sin eso la serie no sirve

**Todo el mundo loguea los sensores. Nadie loguea el RESULTADO.**

Una serie de temperatura, pH y EC sin el resultado del cultivo **no se puede aprender**: es entrada sin
salida. Lo que hay que anotar, planta por planta o bloque por bloque:

| | |
|---|---|
| **Peso** cosechado | el numero que de verdad importa |
| **Cuantas** se cosecharon y **cuantas se descartaron**, y por que | el descarte es la mitad de la historia |
| **Dias** desde siembra hasta cosecha | es lo que el precio premia en frutilla |
| **Calidad**: se espigo? amargo? hoja quemada? raiz marron? | el sintoma es lo que ata el numero a la causa |

**Esto ya esta en el diseño del proyecto y conviene notarlo**: [design.md](../design.md) marca
`campania` con *"cuanto rindio"* como **etiqueta de ML**, y `riego_evento` como *"hypertable +
etiqueta de ML"*. **El diseño ya sabe que sin la etiqueta el historico describe pero no predice.** La
hidroponia de la casa es donde eso se ejercita por primera vez.

## Y una pregunta que hay que contestar antes de optimizar: optimo segun que?

*"Hasta tener la confirmacion optima"* -- **optima medida en que?** No es lo mismo:

- **rendimiento** (kilos o matas por m2),
- **velocidad** (dias hasta cosecha, que en frutilla vale **6x** en precio),
- **calidad** (que se pueda vender como premium),
- **costo por unidad** (nutrientes y luz por lechuga),
- **confiabilidad** (cuantos ciclos seguidos sin perder un lote).

**Se elige UNA como principal antes de arrancar, y las otras se miran como restriccion.** Un lazo sin
objetivo declarado no converge: oscila.

## Entonces, el plan corregido

Esto **reemplaza** el orden mas conservador que estaba en
[economia/ruta-a-10-millones.md](../economia/ruta-a-10-millones.md), donde decia "ciclo 1 y 2 a mano".
Con presencia diaria y bloques, eso es demasiado lento.

| | que se hace |
|---|---|
| **Medicion** | **todo, automatico, desde el dia uno.** No se gradua |
| **Resultado** | **se loguea siempre**: peso, conteo, descarte, dias, sintomas. Es la etiqueta |
| **Acciones de bajo daño** -- aireador, recirculacion, sombra | automatizar **ya**, y **en bloques** para que sean atribuibles |
| **Acciones que matan** -- dosificacion de pH y nutrientes | automatizar **en un bloque solo**, con los otros a mano de control. Si mata, mata 50 plantas y **se sabe que fue eso** |
| **Objetivo** | **uno, declarado por escrito antes del ciclo** |

> **La regla corta: automatiza todo lo que quieras, pero que cada cosa automatizada tenga su bloque de
> control.** Asi la planta que se muere **te dice por que se murio**, en vez de dejarte seis
> sospechosos y 45 dias perdidos.

## Lo que falta decidir

- **Cual es el objetivo principal del primer ciclo.** Lo elige el dueño, no sale de los datos.
- **Cuantos bloques entran** en el sistema del patio. Depende de los m2, que sigue siendo el hueco.
- **Como se anota el resultado sin que sea un trabajo aparte.** Si anotar la cosecha cuesta media hora
  por dia, se deja de anotar en dos semanas. Tiene que entrar en el mismo momento en que se cosecha.
