# Plataforma digital de ensayos tipo PAES 

## Descripción del Proyecto

Este proyecto tiene como objetivo desarrollar una plataforma digital de ensayos tipo PAES (Prueba de Acceso a la Educación Superior), en colaboración con la red de colegios SIP (Sociedad de Instrucción Primaria). La plataforma está diseñada para que los profesores puedan crear, gestionar y publicar preguntas tipo PAES, permitiendo a sus alumnos acceder a ensayos personalizados y practicar de forma autónoma.

Características principales:
- Sistema de creación y edición de preguntas por parte de los docentes.

- Generación de ensayos automáticos o personalizados según área temática.

- Acceso individual para estudiantes con historial de rendimiento.

- Estadísticas y reportes de resultados para seguimiento pedagógico.

- Interfaz amigable y pensada para el contexto escolar chileno.

Esta iniciativa busca potenciar la preparación de los estudiantes de enseñanza media para la PAES, entregando una herramienta útil tanto para docentes como para alumnos, con foco en la mejora continua del aprendizaje.
## Integrantes del Equipo

- Franciso Alejandro Espinosa Ramirez - Rol: 202130523-8 
- Bastian Ignacio Torres Campillay - Rol: 202204637-6
- Bastián Ulloa Hernandez - Rol: 202130532-7
- Jorge Ríos Cueva - Rol: 202204564-7
- **Tutor:** Benjamin Daza Jimenez 


## Arquitectura Técnica

El sistema está compuesto por 3 servicios:

- **Frontend**: React 
- **Backend**: Node.js + Express (Dockerizado)
- **Base de datos**: PostgreSQL (Dockerizado)

Todos los servicios son orquestados mediante `docker-compose`.

---
## Demostración del Prototipo

El prototipo permite:

- Visualizar ensayos existentes desde la base de datos.
- Agregar un nuevo ensayo desde la interfaz web.
- Conexión en tiempo real entre frontend y backend vía API REST.

---
## Estado de las Tareas

| Tarea                                      | Estado  |
|-------------------------------------------|----------|
| Diseño de la arquitectura                 | Completo |
| Implementación del backend (Node.js + DB) | Completo |
| Implementación del frontend (React)       | Completo |
| Dockerización del sistema completo        | Completo |
| Historia de usuario implementada          | Completo |
| Demostración funcional                    | Completo |

---
## Presentación del Cliente

[Enlace a la presentacion del cliente](https://usmcl-my.sharepoint.com/:v:/g/personal/francisco_espinosa_usm_cl/EV0DEC4Bcd1Nr3V14j2dQqAB32d1ePXv85Zl1Rf3U0ITUA?nav=eyJyZWZlcnJhbEluZm8iOnsicmVmZXJyYWxBcHAiOiJPbmVEcml2ZUZvckJ1c2luZXNzIiwicmVmZXJyYWxBcHBQbGF0Zm9ybSI6IldlYiIsInJlZmVycmFsTW9kZSI6InZpZXciLCJyZWZlcnJhbFZpZXciOiJNeUZpbGVzTGlua0NvcHkifX0&e=3RqHxm) 

## Wiki del Proyecto

[Enlace a la Wiki del proyecto](https://github.com/frkalejandro/GRUPO04-2025-PROYINF/wiki)

## VideoH3
https://youtu.be/9rbfV6fwiAQ

## Video Presentacion Final

[Enlace a la presentacion](https://www.youtube.com/watch?v=PfROH8VlcLw)

