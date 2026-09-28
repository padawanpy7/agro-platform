# La API de control: lo primero que se construye

**28/09/2026.** Decision del dueño, y es la primera instruccion de construccion concreta de toda la
ficha:

> *"Lo primero que hay que hacer son las APIs de control de esta app, que va a ser consumida desde la
> app de gestion. Como minimo es ABM de cliente y ABM para asignar modulos al cliente. Todas las bajas
> van a ser logicas... Entonces con esa API creo el primer cliente y le doy todos los modulos, asi
> desde el minuto 0 ya empezamos bien el RLS."*

**Es la rebanada correcta, y conviene decir por que**: es lo **mas chico que ejercita el nucleo
entero**. Un `cliente` es un `tenant`; asignarle modulos toca `tenant_modulo`; y crear el primero con
todo habilitado **obliga a que la RLS funcione antes de que exista un solo dato**. No es una feature:
es el **piso** sobre el que se apoya todo lo demas.

**Y no saltea el plan**: sigue necesitando la Fase 0 (Postgres levantada, comandos declarados en
`project.yml`, playbook de BD) y es un **recorte** de la Fase 1, no un desvio. Lo que hace es reducir
la Fase 1 a su nucleo: **las tablas que hacen falta para que exista un cliente**, y nada mas.

## Lo minimo, y esta bien que sea minimo

| operacion | que toca |
|---|---|
| **Alta de cliente** | `cliente` |
| **Modificacion de cliente** | `cliente` |
| **Baja LOGICA de cliente** | `cliente.baja_en` -- nunca `DELETE` |
| **Asignar modulo a un cliente** | `tenant_modulo` |
| **Quitar modulo** | `tenant_modulo`, tambien **logica** |
| **Listar clientes y sus modulos** | las dos |

**Quien la consume**: la app de gestion del dueño, que vive **afuera** de agro-platform. Esa app
**escribe**; agro **lee y hace cumplir**. Asi el producto queda, como pidio el dueño, **100% RLS**.

## Bajas logicas: la razon es buena, y abre un problema que hay que resolver ahora

**El motivo del dueño**: *"si un cliente se da de baja yo puedo seguir usando los datos recopilados
para el ML"*. **Es correcto y es la decision que corresponde** -- borrar el historico de un cliente que
se fue destruye anios de dato que no se pueden reconstruir, y la regla 1 del contrato ya dice que un
dato mal guardado no se arregla despues.

**Pero trae tres consecuencias, y ninguna es obvia:**

### 1. Baja logica + RLS es una trampa conocida

La policy de RLS filtra por `tenant_id`. **Si alguien consigue un token con el `tenant_id` de un
cliente dado de baja, la policy lo deja entrar igual**: para la base, ese tenant existe.

**La baja tiene que estar en los DOS lados:**

- **La API no emite token** para un cliente con `baja_en` no nulo. Es la defensa principal.
- **Y la policy tambien lo verifica**, porque el contrato dice que el aislamiento lo hace cumplir el
  motor y no la capa de servicio. Algo del orden de:

```sql
using (
  tenant_id = current_setting('app.tenant_id', true)::uuid
  and exists (select 1 from cliente c
              where c.id = tenant_id and c.baja_en is null)
)
```

**Sin la segunda mitad, "dar de baja" es una convencion, no una propiedad de la base** -- y eso es
exactamente lo que el proyecto decidio no hacer.

### 2. Si TODO es RLS, como lee el ML?

**Esta es la pregunta que la decision del dueño destapa y todavia no tiene respuesta escrita.**

El objetivo declarado -- *"seguir usando los datos recopilados para el ML"* -- **necesita leer a traves
de MUCHOS tenants a la vez**. Y eso es **precisamente lo que la RLS existe para impedir**.

> **No es una contradiccion, es una pieza que falta: hace falta un CAMINO SEPARADO Y DELIBERADO para el
> agregado**, distinto del rol de la aplicacion.

Lo minimo que ese camino tiene que cumplir:

| | |
|---|---|
| **Rol de base distinto** del rol de la app | el rol de la app **nunca** puede leer cruzado. Si pudiera, la RLS no sirve para nada |
| **Solo agregado y anonimo** | sin `tenant_id`, sin nombres, sin ubicacion exacta |
| **Auditado, siempre** | cada corrida queda registrada: quien, cuando, que consulto |
| **Amparado por el contrato** | es la clausula de propiedad del dato de [el-sistema-completo.md](el-sistema-completo.md) §6. **Tecnicamente se puede; contractualmente hay que poder** |

**Y conviene diseñarlo ahora aunque se construya en dos anios**, porque si aparece despues, aparece
como un parche que perfora la RLS -- y ese parche es el agujero de seguridad mas probable de todo el
sistema.

### 3. Baja logica en TODO, no solo en cliente

Si el criterio es *"el dato no se borra"*, **vale igual para `usuario`, `parcela`, `dispositivo` y
`campania`**. Una parcela borrada de verdad **se lleva puesto el historico de mediciones que apuntan a
ella**. El modelo de permisos ya lo tenia previsto con `ON DELETE RESTRICT`; esto lo confirma y lo
extiende: **en este sistema no hay `DELETE` fisico de nada que tenga historia.**

## Como se prueba que quedo bien -- el criterio de aceptacion

**Con la API terminada, esto tiene que dar el resultado esperado** (es el *test en rojo* que el
`design.md` ya pedia, ahora con algo concreto que probarlo):

1. Crear el **cliente A** y darle todos los modulos.
2. Crear el **cliente B** y darle **un solo** modulo.
3. Cargar una parcela en cada uno.
4. **Con el token de A: no ver ni una fila de B.** Ni parcelas, ni modulos, ni nada.
5. **Con el token de A: no poder ESCRIBIR una fila con el `tenant_id` de B.**
6. **Dar de baja a B. Con un token viejo de B: no entrar.**
7. **Y el dato de B sigue en la base**, contable desde el camino de agregado.

**Los puntos 5, 6 y 7 son los que se olvidan.** El 4 lo prueba todo el mundo.

## Lo que esto NO incluye, a proposito

Ni riego, ni sensores, ni satelite, ni pantallas. **Es la cañeria.** El primer dato medido entra
despues, y entra a un sistema que **ya sabe de quien es**.

## Lo que falta decidir

- **Como se autentica la app de gestion** contra esta API: token de servicio, mTLS, o clave con IP
  fija. Es una decision de seguridad y es del dueño.
- **Que pasa con los modulos ya asignados cuando se da de baja un cliente**: se dan de baja tambien, o
  quedan como estaban para que reactivar sea un solo paso.
- **El camino del agregado para ML**: quien lo corre y con que rol. Ver arriba.
- **Si el ABM de usuario entra en esta primera rebanada** o espera. El dueño dijo *"ABM de cliente y
  ABM de modulos"*, sin usuarios -- y el modelo de permisos necesita al menos **un** usuario por
  cliente para que alguien pueda entrar.
