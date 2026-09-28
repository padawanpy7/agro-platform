# El producto es un ERP para estancias, y el goteo es un modulo

**28/09/2026.** Definicion del dueño, textual:

> *"El producto, como yo lo veo, es un ERP para estancias. El goteo es solo una parte, no todo el
> producto. Asi como el ERP tiene modulo de ventas, mi sistema tiene modulo de riego por goteo."*

**Es la definicion de producto mas clara que se dijo en toda la ficha, y explica hacia atras todo lo
que el dueño venia pidiendo** sin que estuviera escrito: multi-cliente con RLS, permisos por modulo,
*"solo paga NDVI, entonces solo puede crear roles de ese modulo"*, la gestion de modulos en otra app,
ganaderia, hidroponia, satelite. **No eran features sueltas: era la arquitectura de un ERP, pedida de
a pedazos.**

Y confirma por la via corta que *"riego de precision"* era el nombre de **un modulo**, no del producto.

## Los modulos, tal como se venian describiendo

| modulo | estado hoy |
|---|---|
| **Riego por goteo** | el que se construye primero. Es el "modulo de ventas" de esta analogia: el que mas se usa |
| **Clima** | estacion meteorologica. Alimenta al riego y al resto |
| **Satelite / pasturas** | NDVI por potrero, con nueve años de historia gratis |
| **Hidroponia** | solucion, bloques, EC y pH |
| **Ganaderia** | rodeo, sanidad, pesaje al paso, movimientos |
| **Trampa de plagas** | conteo por fecha y punto |

**Y los que un ERP de verdad tiene y esta ficha todavia no nombro** -- se anotan para que no aparezcan
de sorpresa: **insumos y stock, compras, costos por lote, jornales y mano de obra, trazabilidad
(SENACSA / SITRAP / EUDR), y facturacion.** Son los aburridos, son la mitad del trabajo de un ERP, y
**son justo donde ya hay competencia** ([economia/ganaderia.md](../economia/ganaderia.md)).

## La trampa de la analogia, y hay que verla ahora

**Un ERP no es un conjunto de modulos: es un conjunto de modulos que comparten el MISMO nucleo.**
Ventas y compras se integran porque tocan **el mismo stock, el mismo cliente y el mismo asiento**. Si
no compartieran eso, serian dos programas con un login comun -- y eso **no es un ERP, es un paquete.**

**Aca el nucleo compartido es otro, y hay que decirlo con nombre:**

```
                    LA PARCELA  +  LA MEDICION  +  LA CAMPAÑA
                 (donde)          (que se midio)   (que resulto)
```

| el nucleo | por que TODOS los modulos lo usan |
|---|---|
| **`parcela`** | un lote de tomate, un potrero, un corral y un cantero de hidroponia **son todos la misma cosa**: un poligono con cosas adentro |
| **`medicion`** | humedad, lluvia, EC, pH, peso del animal, litros: **todas son mediciones** con crudo, calibrado y dos relojes |
| **`campania`** | *"que se puso ahi, cuando, y cuanto rindio"* -- vale para una zafra de tomate **y para un lote de novillos** |

> **La prueba de si esto es un ERP o un paquete es una sola pregunta, y se hace a cada modulo nuevo:**
>
> **"Este modulo escribe en `parcela`, `medicion` y `campania`, o se trae sus propias tablas?"**
>
> **Si se trae las suyas, la integracion es de menu, no de datos** -- y entonces no se puede contestar
> *"a que potrero conviene mover la hacienda"*, que es justamente lo unico que ningun competidor puede
> contestar.

### Y de ahi sale que la pregunta 4 dejo de ser tecnica

La [pregunta 4](../PREGUNTAS.md) -- `medicion` angosta o ancha -- venia con tres argumentos
independientes (riego, hidroponia, ganaderia). **Con la definicion de ERP se vuelve otra cosa: es la
decision que determina si el producto es un ERP o cinco apps con el mismo login.**

**Angosta**: cada modulo nuevo agrega **filas de catalogo** y escribe en la misma tabla -> los modulos
se cruzan solos.
**Ancha**: cada modulo agrega **columnas o tablas propias** -> los modulos no se cruzan, y hay que
programar cada cruce a mano, para siempre.

**Ya no es preferencia de diseño. Es la definicion del producto.**

## La otra trampa: arquitectura de ERP SI, alcance de ERP NO

**Los ERP ganan por integracion y mueren por alcance.** El modo clasico de fracasar es construir **doce
modulos mediocres** en vez de dos que funcionen -- y con **Gs 12 millones y dos dias por semana**, ese
riesgo no es teorico.

> **La regla que separa una cosa de la otra: el MARCO se construye ahora porque despues sale carisimo;
> los MODULOS se construyen de a uno porque despues salen igual.**

| se hace AHORA (marco) | se hace DESPUES (modulos) |
|---|---|
| `medicion` angosta con catalogo de magnitud | el modulo de ganaderia |
| `parcela` como unidad universal, con `campo` arriba | el de hidroponia |
| `campania` como etiqueta universal | el de trazabilidad |
| Permisos por `(recurso, accion)` y por modulo | el de facturacion |
| `tenant_id` + RLS | -- |

**Todo lo de la izquierda ya esta diseñado y no cuesta mas hacerlo bien.** Todo lo de la derecha puede
esperar años sin penalidad, **siempre que la izquierda este bien.**

## ACLARACION del dueño, el mismo dia: es su vision, NO el posicionamiento

> *"El ERP era mi vision nomas, para que no se piense que van a ser apps diferentes para cada cosa. Y
> tampoco decir: esta app es goteo."*

**Corrige el encuadre de este documento y conviene que quede arriba, no al final:**

| | |
|---|---|
| **Hacia adentro** -- equipo, diseño, esquema | *"es un ERP"* es **la brujula**: dice que hay UN nucleo, UNA base, UN login, y que los modulos se cruzan. **Todo lo de arriba sigue valiendo.** |
| **Hacia afuera** -- lo que se dice y lo que se muestra | **no se dice "ERP" ni "estancias" ni "esta app es de goteo".** Es **una sola app** de la que cada cliente usa los modulos que tiene |

**Las dos cosas que NO hay que decir nunca, y por el mismo motivo:**

1. **"Esta app es de goteo"** -- achica el producto a un modulo.
2. **Cualquier cosa que sugiera apps distintas** -- *"la app de riego"*, *"la app de ganaderia"*. **Es
   una, y esa es justamente la ventaja sobre la competencia.**

## Una nota sobre el nombre

*"ERP para estancias"* es una descripcion excelente **hacia adentro**: dice en tres palabras que es y
como esta armado.

**Hacia afuera tiene un limite**: en Paraguay **estancia es ganadera**. Un horticultor de La Colmena
con 3 ha no se siente dueño de una estancia, y la hidroponia de un patio menos. Si el producto abarca
las tres cosas, **"estancia" achica el publico en la primera palabra.**

**No hay que resolverlo hoy** -- el nombre comercial se elige cuando haya a quien vendérselo, y la
pregunta 0 sigue abierta. **Se anota para no quedar atado a una palabra elegida de apuro.**

## Lo que este documento cambia en la ficha

1. **`proposal.md` describe cuatro lineas de producto. Son modulos de un ERP**, y conviene que lo diga
   asi: cambia como se lee todo lo demas.
2. **La pregunta 4 sube de prioridad**: pasa de decision tecnica a **decision de producto**.
3. **Aparece una familia de modulos que no estaba nombrada** -- insumos, compras, costos, jornales,
   trazabilidad, facturacion -- y **hay que decidir si entran o si el producto se queda del lado de lo
   medido**, que es donde no hay competencia.
