# El plan con Gs 12 millones, en la tierra del contacto

**28/09/2026.** Capital declarado por el dueño: **Gs 7 millones en efectivo** y **Gs 5 millones mas
conseguibles en inversion**. Total **Gs 12 millones** = **~USD 1.457** al dolar declarado de Gs 8.235.

## Lo primero, y hay que decirlo sin vueltas

**Gs 12 millones NO alcanzan para una hectarea de tomate.** El costo de zafra son **Gs 45 a 108
millones por hectarea** ([inversion-inicial-tomate.md](../economia/inversion-inicial-tomate.md)): el
capital es **entre 4 y 9 veces mas chico** que lo que pide una hectarea.

**Y eso no es un problema, porque en el primer ciclo no se viene a cosechar una hectarea: se viene a
averiguar si el suelo sirve y si el sistema anda.**

| superficie | plantas | costo de zafra | bruto esperado |
|---|---|---|---|
| 1 ha | 18.000 | **Gs 45-108 M** | Gs 231 M |
| **1.000 m2 (0,1 ha)** | **1.800** | **Gs 4,5-10,8 M** | **~Gs 23 M** |

El bruto de 1.000 m2 sale de los **30.475 kg/ha** medidos en [tomate.md](../economia/tomate.md):
3.048 kg a Gs 7.583. **Con Gs 12 millones de capital, un bruto de Gs 23 millones casi duplica la
plata** -- y lo maneja una o dos personas, que es la otra restriccion real.

## Antes de gastar un guarani: lo que sale CERO y es su negocio de verdad

**El tiene 120 ha de pasto, 130 cabezas y ninguna plantacion.** Su negocio no es la horticultura: es
el ganado. Y lo que mas le sirve **no cuesta nada**.

**NDVI de sus 120 ha por Sentinel-2. Gs 0, sin hardware, sin permiso, sin plantar.**

Y funciona **mucho mejor** ahi que en el cultivo:

```
Sentinel-2 = 10 m por pixel = 100 m2 por pixel

120 ha de pasto   = 1.200.000 m2  ->  ~12.000 pixeles   <-- dato de verdad
1.000 m2 de tomate                ->        10 pixeles   <-- inservible
```

> **El satelite es para sus 120 ha de pasto, no para la parcela de tomate.** Contesta la pregunta que
> un ganadero se hace todas las semanas -- **cuando muevo la hacienda de potrero** -- y es la
> prioridad 1 de [ganaderia.md](../economia/ganaderia.md) justamente porque no cuesta hardware.

**Esto es lo que hay que hacer esta semana**: llegar con un mapa de sus 120 ha antes de pedirle nada.
No sale plata y es la demostracion mas barata que existe.

## Como repartir los Gs 12 millones

**El principio, y es el unico que importa: no pongas el capital en la parte que puede fallar.**

| | Gs | se pierde si la cosecha falla? |
|---|---|---|
| Sensores + controlador (el Nivel 0 del repo son **Gs 592.000** verificados, mas margen) | **~1,0 M** | **NO.** Es tuyo y se reusa |
| **Bomba + filtro** | **~2,0 M** *(estimado)* | **NO.** Y sirve igual para 1 ha despues |
| Goteo para 1.000-2.000 m2 | **~1,5 M** *(estimado)* | NO, las cintas duran varias zafras |
| Camellones con el tractor prestado | **~0,3 M** de combustible | -- |
| Plantines, fertilizante, sanidad, tutorado | **~4,0 M** | **SI, todo** |
| **Reserva intacta** | **~3,0 M** | -- |

**Los estimados estan marcados como estimados**: no hay precio paraguayo verificado del equipo de
goteo ni de la bomba. Son los mismos huecos de
[inversion-inicial-tomate.md](../economia/inversion-inicial-tomate.md), y se cierran con una cotizacion.

**Fijate lo que dice la ultima columna**: de los Gs 12 M, **solo ~Gs 4 M estan expuestos a que la
cosecha se pierda**. El resto es equipo que queda y reserva que no se toca. **Asi se entra a un suelo
que no conoces.**

> **La bomba y el filtro no escalan hacia abajo** -- cuestan casi lo mismo para 1.000 m2 que para 1 ha.
> Eso hace caro el metro cuadrado del primer ciclo y **no es un desperdicio**: es la pieza que el
> segundo ciclo ya no vuelve a pagar.

### Y sobre los Gs 5 millones de inversion ajena

Si esos Gs 5 M vienen de otra persona, **vienen con una expectativa**. Y un primer ciclo en un suelo
desconocido, con un cultivo que nadie de los dos hizo antes, es **lo peor que se puede financiar con
plata de un tercero**.

**Sugerencia: el ciclo 1 con tus Gs 7 M, y los Gs 5 M para el ciclo 2**, cuando ya sepas si el suelo
drena, cuanto rinde y cuanta gente hace falta. Es el mismo dinero, con el riesgo puesto donde
corresponde.

## Que plantar, y la decision que yo tomaria

El suelo **no drena** -- gris, impermeable, siempre lodazal
([09-oferta-tierra-maquinaria.md](09-oferta-tierra-maquinaria.md)). Eso obliga **camellones**, y
descarta plantar a nivel.

**Recomendacion: partir los 1.000-2.000 m2 en DOS, mitad tomate y mitad sandia.**

| | a favor | en contra |
|---|---|---|
| **Tomate** | el unico rendimiento **medido** de la carpeta; el mayor valor; los camellones estan **explicitamente** recomendados para el | mucha mano de obra, tutorado, y **en suelo humedo la presion de hongos y bacterias es alta** |
| **Sandia** | **siembra directa**, sin almacigo ni tutorado; ~85 dias; cosecha en diciembre | menos valor, y las cucurbitaceas tampoco quieren raiz mojada |

**Por que las dos y no una**: es el primer ciclo en un suelo que nadie midio. Dos cultivos en la
misma parcela y la misma temporada dan **dos datos en vez de uno**, cuestan apenas mas que uno, y si
uno se pierde el otro sigue dando informacion -- y tal vez plata. **En el ciclo 1 estas construyendo
el dataset, no el negocio.**

**Y el almacigo de tomate se siembra YA**: la ventana es julio-noviembre y el transplante llega hasta
diciembre. Cuesta casi nada y **mantiene la decision abierta un mes y medio mas**, hasta saber como
se comporta el suelo con los primeros riegos.

## El orden de las cosas

1. **NDVI de las 120 ha.** Gs 0. Esta semana.
2. **Sensor de humedad en la parcela, ANTES de plantar.** No para regar: **para decidir cuando pasar
   el tractor.** En arcilla pesada la labranza en humedo destruye la estructura y el daño dura años, y
   con maquina prestada la tentacion es usarla cuando esta disponible y no cuando el suelo esta a
   punto. **Es el primer dato que se paga solo.**
3. **Camellones** con el tractor prestado.
4. **Goteo, bomba y filtro** en 1.000-2.000 m2.
5. **Almacigo de tomate ya**, siembra directa de sandia en octubre.
6. **Reserva de Gs 3 M sin tocar.**

## Lo que sigue abierto

- **Cotizar** goteo, bomba y filtro para 1.000-2.000 m2. Son los dos estimados de la tabla.
- **De quien es la cosecha.** Es el papa de un compañero, presta de confianza y sabe del proyecto --
  y **justo por eso conviene dejarlo dicho antes**: cuando la relacion es buena es cuando nadie quiere
  hablar de plata, y es cuando mas facil sale hablarlo.
- **Una referencia agronomica que no sea el.** El no es agricultor: no va a discutirle al sistema
  -bueno para la adopcion- pero **tampoco puede decirte si el sistema se equivoca**. CAICA, la
  cooperativa o el IPTA ([02-caica.md](02-caica.md)).
- **Analisis de suelo del IPTA** antes de comprar fertilizante. En un vertisol la fertilidad
  probablemente no sea el problema, y conviene saberlo en vez de suponerlo.
- **Cuantas hectareas de las 120 estan en pasto util** y cuantos potreros hay, para que el NDVI diga
  algo accionable y no solo lindo.
