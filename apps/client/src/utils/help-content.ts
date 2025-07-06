import { App as KossabosApp } from '@kossabos/core';

export enum Locale {
  EN_US = 'en-US',
  ES_ES = 'es-ES',
}

export type LocaleType = `${Locale}`;

export const generateHelpContent = (app: KossabosApp, locale: LocaleType): string => {
  if (locale === Locale.EN_US) {
    return `## Welcome to ${app.name}

**Created by:** ${app.author.username}

### Getting Started
This is an interactive game/application built with the Kossabos platform.

### How to Play
- Interact with the game interface in the main area
- Use the controls provided within the game
- Click the **Reset** button at the bottom to restart

### Features
- **Settings**: Configure game preferences (gear icon)
- **Statistics**: View your game statistics (chart icon)  
- **Help**: This help dialog (question mark icon)

### Need More Help?
Contact the game author or check the game's documentation for specific gameplay instructions.`;
  } else {
    return `## Bienvenido a ${app.name}

**Creado por:** ${app.author.username}

### Primeros Pasos
Esta es una aplicación/juego interactivo construido con la plataforma Kossabos.

### Cómo Jugar
- Interactúa con la interfaz del juego en el área principal
- Usa los controles proporcionados dentro del juego
- Haz clic en el botón **Reiniciar** en la parte inferior para empezar de nuevo

### Características
- **Configuración**: Configura las preferencias del juego (ícono de engranaje)
- **Estadísticas**: Ve tus estadísticas del juego (ícono de gráfico)
- **Ayuda**: Este diálogo de ayuda (ícono de signo de interrogación)

### ¿Necesitas Más Ayuda?
Contacta al autor del juego o consulta la documentación del juego para instrucciones específicas de jugabilidad.`;
  }
};
