# La Colmena: sintesis

**Investigado el 25/09/2026** con fuentes publicas. Cada dato numerico lleva su fuente; lo que no
se encontro esta en [07-vacios.md](07-vacios.md) y **no se completo con estimaciones**.

## La conclusion, primero

**La Colmena es el mejor candidato a piloto que se evaluo hasta ahora**, por cuatro razones que
salen de los datos y no de la intuicion:

1. **Densidad**: 114 ha de uva en UNA cooperativa, en un distrito chico. La cobertura LoRa de un
   gateway alcanza a varios socios a la vez -la unica economia de escala del negocio, ver
   [ECONOMIA.md](../ECONOMIA.md)-.
2. **Valor por hectarea alto**: fruta, no commodity. Rindes de 12.000 a 15.000 kg/ha en uva.
3. **Una contraparte institucional que ya agrupa**: CAICA recolecta la produccion de socios **y de
   productores independientes**, la lleva a Asuncion y la vende. **No hay que convencer de a uno.**
4. **El dolor esta documentado y es climatico**: el frio y la sequia les costaron durazno, melon,
   ciruela y uva, y el propio presidente dice que las medidas de proteccion **son inviables por
   costo**.

**Y la advertencia que va con eso**: el punto 4 es una oportunidad **solo si lo que se ofrece es
mas barato que la proteccion que ya descartaron**. Un sistema que avisa de una helada sin que haya
con que responderla no vende. Lo que si se puede prometer con lo que tenemos es **riego** y
**dato**, no proteccion contra heladas.

## Lo que esta confirmado

| | dato | fuente |
|---|---|---|
| Ubicacion | distrito de Paraguari, ~130 km de Asuncion | [ABC, 2025](https://www.abc.com.py/nacionales/2025/12/19/la-colmena-con-mas-de-50-feriantes-arranca-manana-la-xv-expo-frutas/) |
| Fundacion | 1936, primera colonia japonesa del pais. 11 familias, 81 personas. Fundador: Dr. Kunito Miyasaka, que compro 11.500 ha | [Municipalidad](https://municipalidadlacolmena.gov.py/la-colmena/) |
| Poblacion | **5.234 (Censo 2002)**, 7% de origen japones. **El dato de 2022 NO se pudo confirmar** | [Municipalidad](https://municipalidadlacolmena.gov.py/la-colmena/) |
| Agua | cuenca del rio Tebicuary-mi; arroyos Rory, Rory-mi, Jahapety, Paso Tranquera, Mendoza, Kure Paso | [Municipalidad](https://municipalidadlacolmena.gov.py/la-colmena/) |
| Intendente | Sergio Galeano (ANR) | [ABC, 12/2025](https://www.abc.com.py/nacionales/2025/12/19/la-colmena-con-mas-de-50-feriantes-arranca-manana-la-xv-expo-frutas/) |

## La cooperativa

**CAICA** -Cooperativa Agroindustrial Colmena Asuncena Ltda.- es la contraparte natural.
Presidente: **Eduardo Koichi Miyamoto**. Detalle en [02-caica.md](02-caica.md).

Lo que la hace interesante como canal: **ya resuelve la logistica y la venta de sus socios Y de
productores independientes**. Quien entre por ahi entra a una lista de productores que ya existe.

## Los cuatro modulos contra lo que La Colmena necesita

| modulo | encaja? | por que |
|---|---|---|
| **Satelite (NDVI)** | **si, y va primero** | cero hardware, cero capex. Sobre 114 ha de vid da uniformidad y vigor sin pedirle nada a nadie |
| **Riego** | **si, es el caballo de batalla** | pero **hay que ver el sistema de riego real antes de prometer** (ver 07-vacios) |
| **Clima** | **si, y aca vale MAS que en horticultura** | fruta de carozo y vid necesitan **horas de frio**, y la prensa documenta tanto exceso de frio como **falta de invierno**. Grados-dia y horas-frio son la variable del negocio, no un adorno |
| **Trampas** | ultimo | el mas caro de sostener, y no es el dolor declarado |

**El hallazgo agronomico que cambia el pitch**: en uva y durazno el problema no es solo el agua.
Una nota de prensa documenta *"poco frio: falta de invierno afecto produccion de durazno"*, y otra
documenta perdidas **por** frio intenso. Son dos fallas opuestas y **las dos se miden con la misma
estacion meteorologica**. Eso convierte al modulo clima de "tercero" a **argumento de entrada**.

## Como leer esto antes de la reunion

1. [07-vacios.md](07-vacios.md) -- **empezar por aca**: es la lista de lo que hay que preguntar.
2. [04-riego-agua.md](04-riego-agua.md) -- lo que se sabe y lo que no del agua. Es el tema central
   y **es donde menos fuente publica hay**.
3. [05-clima-riesgos.md](05-clima-riesgos.md) -- las perdidas documentadas, con fechas.
4. [02-caica.md](02-caica.md) -- con quien se habla.
