# El wizard de eventos: un veterinario agronomo junior, siempre disponible

**28/09/2026.** Idea del dueño, y el encuadre es suyo:

> *"Para la imagen vamos a hacer un flujo wizard donde se registren las cosas, por ejemplo evento
> tomate podrido... al final que saque una foto... segun descripcion y foto matchear con IA el caso y
> que medidas hay que tomar. Esto mismo podemos hacer con el ganado: 'hoy mi ternero en el potrero X
> tuvo gusano' o 'hubo sangre'... y sacarle foto y matchear que puede ser."*
>
> *"Seria como un veterinario agronomo junior en un solo lugar."*

**"Junior" es la palabra exacta, y conviene tomarla en serio porque define el producto entero.**

## Por que "junior" es el nivel correcto, y no una limitacion

| lo que hace un junior bueno | lo que hace este sistema |
|---|---|
| **Reconoce lo comun** | *"esto se parece a gusanera"*, *"esto se parece a podredumbre apical"* |
| **Sabe cuando NO sabe** | *"esto no lo puedo decir. Llamalo al veterinario"* |
| **NO receta** | no da dosis ni elige el producto |
| **Documenta bien** | y **esto es lo que mas vale**, porque hoy no lo hace nadie |

> **Un junior bueno es el que sabe cuando no sabe. El producto peligroso es el que actua de senior.**
> Y el que documenta bien le ahorra mas trabajo al veterinario que el que adivina el diagnostico.

**Y hay una razon de negocio, no de escrupulo, para no recetar**: en un animal la **dosis y el periodo
de carencia** deciden si queda residuo en la carne. Un residuo es un problema con **SENACSA** y con el
**EUDR**, que es justo el mercado que el frigorifico necesita cuidar. **Un sistema que sugiere dosis
por foto es un riesgo para el cliente y para el producto.** Lo mismo del lado vegetal con la autoridad
fitosanitaria (SENAVE -- *no verificado en esta sesion*).

**La version que si gana**: el sistema dice **que se parece**, **a quien llamar** y **que conviene
mirar**, y despues **registra que se aplico de verdad** -- producto, dosis, fecha, quien. **Ese
registro es exactamente lo que la trazabilidad exige y lo que hoy nadie lleva.**

## LA decision de diseño: separar LO QUE SE VIO de LO QUE SE CREE

**Es la unica parte de este documento que, si sale mal, arruina el dataset para siempre.**

Si el capataz dice *"tuvo gusano"* y eso se guarda como el hecho, pasan dos cosas malas:

1. **Si se equivoco, la etiqueta queda envenenada** -- y nadie se entera nunca.
2. **La observacion se perdio.** Queda la conclusion y no los sintomas, asi que **no se puede
   recalcular** cuando el modelo mejore.

```
observacion   <- HECHOS: que se vio, donde, cuando, cuanto, la foto
                 esto no cambia nunca
diagnostico   <- LO QUE SE CREE: que puede ser, quien lo dijo, con cuanta certeza
                 esto se agrega, se corrige y se confirma -- y NO se edita por debajo
```

**Es exactamente el mismo principio que `valor_crudo` y `valor_calibrado`**, y por el mismo motivo:
*"si en seis meses se descubre que la formula estaba mal, con el crudo se recalcula todo"*. **La
observacion es el crudo. El diagnostico es la calibracion.**

### Tres niveles de certeza, y hay que distinguirlos en la base

| quien lo dijo | cuanto vale |
|---|---|
| **El modelo** -- *"se parece a X"* | una **sugerencia**. Nunca es la etiqueta |
| **La persona** -- el capataz eligio de la lista | una **opinion de campo**. Vale, y se puede equivocar |
| **El veterinario o el tecnico** -- confirmado | **la etiqueta de verdad**, y es la unica que entrena |

> **Y aca hay una trampa que hunde proyectos de ML y no se ve venir: si la sugerencia del modelo se
> guarda como diagnostico, el modelo siguiente se entrena con sus propias salidas.** Cada vuelta
> refuerza sus errores hasta que el sistema es seguro de si mismo y esta equivocado. **Solo entrena lo
> CONFIRMADO**, y por eso `confirmado_por` no es un campo decorativo: es lo que separa el dataset del
> eco.

## Los pasos, para los dos casos

**Corto, con botones grandes y eleccion antes que teclado** -- las nueve reglas de
[quien-usa-esto.md](quien-usa-esto.md).

### Planta -- *"tomate podrido"*

1. **Que viste?** Lista corta **con fotos de ejemplo** al lado. La foto de ejemplo hace mas por la
   precision del dato que cualquier texto.
2. **Donde?** Se toca el lote en el mapa. Y si quiere, el punto exacto.
3. **Cuanto?** *una planta / un pedazo / todo el lote.*
4. **Foto**, una o varias.
5. **Confirmar**, con todo a la vista.

### Animal -- *"el ternero tuvo gusano"*, *"hubo sangre"*

1. **Que viste?** gusanera, sangre, cojea, no come, se aparta, flaco.
2. **Cual?** la caravana -- leida o elegida -- **o todo un lote**.
3. **Donde?** el potrero.
4. **Foto.**
5. **Confirmar.**

### Lo que el sistema agrega solo, sin preguntar

Y esto es lo que el dueño llamo *"toma los datos del dia para la serie"*, **que es la mejor parte de la
idea**:

| | |
|---|---|
| Fecha y hora, y **quien** lo cargo | |
| La **campaña vigente** de esa parcela | es la que despues le presta la etiqueta ([fotos-y-dataset.md](fotos-y-dataset.md)) |
| El **estadio** del cultivo | sin eso, *"tomate podrido"* no se puede comparar entre campañas |
| **La serie de los ultimos dias** -- humedad, lluvia, temperatura, cuando se rego | **es el contexto que vuelve diagnosticable al evento.** Podredumbre apical despues de diez dias secos y podredumbre despues de tres dias de lluvia **no son la misma historia** |

> **Ese enganche automatico es lo que ningun cuaderno y ninguna app de registro puede hacer**, porque
> ninguna tiene la serie. **Es el diferenciador, y sale gratis.**

## El campo que todos se olvidan: CUANTO

*"Tuvo gusano"* y *"3 de 130 tuvieron gusano"* **no son el mismo dato**. Sin severidad:

- no se puede ver si va **mejorando o empeorando**,
- no se puede comparar **un año con otro**,
- y no hay nada que un modelo pueda predecir, porque **no hay magnitud**.

**Va en el paso 3 de los dos wizards, y es una sola pantalla de tres botones.**

## Sin señal, igual tiene que andar

**En el campo no hay señal, y el evento pasa ahi.** El wizard guarda en el telefono y sincroniza
despues. **Y ahi los dos relojes dejan de ser un detalle de diseño**: `ocurrido_en` es cuando el
capataz lo vio, `recibido_en` es cuando llego al servidor, y entre los dos puede haber tres dias.

**Si se guarda uno solo, se pierde la fecha real del evento o se pierde el retraso** -- y las dos le
importan al modelo.

## Lo que agrega al esquema

| tabla | que guarda |
|---|---|
| **`observacion`** | que se vio (catalogo de sintomas), donde, **cuanto**, cuando -- los dos relojes --, quien, y el enganche a parcela / campania / animal |
| **`diagnostico`** | que se cree que es, **quien lo dijo** (modelo / persona / tecnico), la certeza, y si se confirmo. **Se agrega, no se edita** |
| **`tratamiento`** | que se aplico de verdad: producto, dosis, fecha, quien. **Es el registro de trazabilidad**, no una receta |
| *(`foto` de [fotos-y-dataset.md](fotos-y-dataset.md))* | se cuelga de la observacion |

**Pasan la prueba del [ERP](el-producto-es-un-erp.md)**: se cuelgan de `parcela`, `campania` y
`animal`; no se traen tablas propias.

## Lo que falta decidir

- **El catalogo de sintomas**: cuales entran. Sale de preguntarle al capataz que ve de verdad, no de
  un libro. Es la conversacion del sabado.
- **Que modelo hace el match**, y si corre afuera. Empezar con uno ajeno es lo correcto
  ([fotos-y-dataset.md](fotos-y-dataset.md) §5).
- **Quien confirma** un diagnostico cuando no hay veterinario cerca, y si un diagnostico sin confirmar
  entra o no al entrenamiento. **Recomendacion: no entra.**
- **Verificar que autoridad rige** los productos fitosanitarios en Paraguay antes de escribirlo en
  ningun lado.
