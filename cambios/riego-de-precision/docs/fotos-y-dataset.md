# Fotos: como se guardan para que sirvan al ML, y no solo para mirarlas

**28/09/2026.** Pedido del dueño:

> *"Hay que preparar subida de imagenes tambien, asi un modelo puede decir si esta bueno o malo y ver
> que dato fue diferente entre cosechas para ajustar en la siguiente."*

**El pedido esta bien y la parte dificil no es subir la foto: es que la foto sea ENTRENABLE.** Una
carpeta con diez mil fotos de tomate no es un dataset. Este documento dice que hay que guardar
alrededor de cada foto para que lo sea.

## 1. La foto NO va a la base. Va el puntero

**Es la misma decision que el diseño ya tomo para el satelite**, y por el mismo motivo:

> `indice_espacial`: *"**No se guarda el raster**: un vuelo produce gigabytes. Va el agregado por
> parcela mas un **puntero al archivo** en almacenamiento de objetos."*

**La foto se comporta igual.** Una foto de telefono son 2 a 5 MB. Si el capataz saca veinte por dia,
son **~100 MB por dia y ~36 GB por año por campo**. Y el disco de este VPS ya se fue a **3 segundos
por `fsync`** el 07/09.

| va a | que |
|---|---|
| **Almacenamiento de objetos** | el archivo original, intacto |
| **Postgres** | la fila con el puntero, los metadatos y **las etiquetas** |

**Y una tension con la regla 1 que conviene resolver ahora**: *"el dato no se degrada"*. Con fotos eso
choca con el volumen. **La salida es guardar el original en almacenamiento frio y servir una copia
redimensionada.** El original no se toca ni se borra; lo que se muestra es un derivado -- **igual que
los `continuous aggregates` de Timescale son derivados de la medicion cruda.** Mismo principio, otro
tipo de dato.

## 2. Lo que hace entrenable a una foto, y NO es la foto

| dato | por que sin el la foto no sirve |
|---|---|
| **Donde** -- el punto, y a que parcela cae | una foto sin lugar no se puede cruzar con nada. `ST_Contains` le asigna la parcela sola |
| **Cuando** -- los DOS relojes | sacada y recibida. El telefono puede subirla tres dias despues, desde el pueblo |
| **A que apunta** -- parcela, planta, animal, bloque | *"una foto del lote"* y *"una foto de ESTA planta"* son datasets distintos |
| **El estadio** -- en que momento del cultivo | una foto de tomate **no significa nada** si no se sabe si estaba en floracion o en cuaje. Es una de las fechas fenologicas del [Minimum Data Set](el-sistema-completo.md) |
| **Quien la saco** | para poder descartar las de alguien que fotografiaba mal |
| **LA ETIQUETA** | que resulto despues |

### Y aca esta el problema que casi nadie resuelve bien

> **La etiqueta llega DESPUES que la foto, y a veces meses despues.**
>
> La planta se fotografia en noviembre. **El rendimiento se sabe en febrero.** La enfermedad se
> confirma dos semanas mas tarde. Si el esquema no permite **colgar un resultado de una foto vieja**,
> el dataset nunca se etiqueta -- y una foto sin etiqueta no entrena nada.

**La pieza que lo resuelve ya existe y se llama `campania`.** La foto se ata a la campaña; la campaña
guarda *"cuanto rindio"*. **Cuando llega la cosecha, todas las fotos de esa campaña quedan etiquetadas
de una sola vez, sin tocarlas.**

```
foto  ->  parcela  ->  campania  ->  rendimiento
                            ^
                            +-- la etiqueta llega aca, meses despues,
                                y alcanza a todas las fotos de la campaña
```

## 3. El EXIF se extrae AL SUBIR, no se deja adentro

El telefono mete en el archivo la fecha, el GPS, el modelo de camara y la orientacion. **Eso hay que
sacarlo y guardarlo en columnas al momento de recibir la foto**, por dos motivos concretos:

1. **Redimensionar borra el EXIF.** Si el dato vive solo adentro del archivo, el primer procesamiento
   se lo lleva.
2. **Algunas apps y algunos servidores lo eliminan por privacidad** antes de que llegue.

**Si el GPS del EXIF falta, la foto se guarda igual pero marcada como sin ubicacion.** No se inventa
la posicion con la de la parcela: eso seria un dato falso que despues nadie puede distinguir de uno
real -- el mismo error que guardar un punto de RSSI como si fuera GPS.

## 4. "Que dato fue diferente entre cosechas": la foto sola no lo contesta

**Este es el pedido mas ambicioso de los tres y el que tiene la trampa.** Para decir *"esta cosecha
fue mejor porque X"*, hacen falta **dos campañas que difieran en algo REGISTRADO**.

> **Si entre una cosecha y la otra nadie anoto que cambio, no hay X que encontrar.** El modelo no
> puede descubrir una variable que nunca se escribio -- ve dos resultados distintos y ninguna causa
> candidata.

**Y por eso la lista de que anotar ya existe y es gratis: es el Minimum Data Set** -- suelo, manejo,
fechas fenologicas, rendimiento ([el-sistema-completo.md](el-sistema-completo.md) §1). **Sin eso, las
fotos son un album. Con eso, son un experimento.**

**Y la forma de acelerarlo tambien esta escrita**: [bloques](como-aprender-de-cada-ciclo.md). Comparar
la cosecha de octubre con la de diciembre **mezcla la variable que cambiaste con el verano entero**;
comparar dos bloques de la misma semana, no.

## 5. Honestidad sobre el modelo que "dice si esta bueno o malo"

**Se puede, y no en el primer año.** Un clasificador de imagen necesita **cientos a miles de ejemplos
etiquetados por clase**. Un campo con dos cosechas al año **no los junta en años.**

**Pero eso no es motivo para no empezar hoy, por tres razones:**

1. **La foto vale antes de que exista cualquier modelo.** *"Se pudrio"* + la foto + la serie de
   humedad de esa semana **es un diagnostico que hace una persona**, y es mas de lo que hoy tiene
   nadie.
2. **No hay que entrenar desde cero.** Existen modelos y datasets publicos de enfermedades de plantas,
   y servicios que clasifican. **El dataset propio sirve para AJUSTAR uno existente**, que necesita
   muchisimos menos ejemplos.
3. **Lo que no se puede recuperar es el pasado.** Un modelo se entrena cuando haya datos; **los datos
   solo existen si alguien saco la foto ese dia.** Empezar a juntar es la unica parte que no se puede
   hacer despues.

> **Empezar a guardar hoy, entrenar mucho despues o nunca -- y usar el de otro mientras tanto.**

## 6. Lo que agrega al esquema

| tabla | que guarda |
|---|---|
| **`foto`** | puntero al archivo, hash, punto geografico, `sacada_en` y `recibida_en`, a que apunta (parcela / campania / animal / bloque), estadio, quien la saco, y el EXIF extraido |
| *(`campania` ya existe)* | es la que **le presta la etiqueta** a todas sus fotos |

**Pasa la prueba del [documento del ERP](el-producto-es-un-erp.md)**: no se trae tablas propias, se
cuelga de `parcela` y `campania`. Y **sirve igual para el animal** -- una foto del novillo en el
pesaje es el mismo tipo de dato.

## Sobre "evolucionar lo agropecuario"

El dueño lo resumio asi: *"optimizar el terreno, animales, plantaciones, calidad"*, apuntando siempre
a **un buen dataset para el entrenamiento**.

**Es el objetivo correcto y ya estaba escrito en el `proposal.md`**: *"esta ficha construye el dataset
y deja el lugar donde el modelo se va a enchufar"*.

> **Y lo unico que hay que repetir, porque es lo que decide si funciona: el dataset no es lo que se
> mide. Es lo que se mide MAS lo que resulto.** Todo el mundo loguea los sensores; casi nadie loguea
> la cosecha, el peso, el descarte y el motivo.
>
> **Un sensor barato que loguea siempre, con su resultado anotado, vale mas que diez sensores caros
> sin etiqueta.**

## Lo que falta decidir

- **Donde va el almacenamiento de objetos**: en el VPS o afuera. El disco de este VPS no es el lugar.
- **Que tamaño se sirve** y si se guarda mas de un derivado.
- **Cuantas fotos por campaña** se esperan, para dimensionar. Es una pregunta para el capataz.
- **Si la foto puede subirse sin señal** y sincronizar despues. En el campo es casi seguro que si
  -- y ahi los dos relojes dejan de ser un detalle.
