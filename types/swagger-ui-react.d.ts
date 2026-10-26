declare module 'swagger-ui-react' {
  import type { ComponentType } from 'react';

  const SwaggerUI: ComponentType<{ url?: string }>;
  export default SwaggerUI;
}