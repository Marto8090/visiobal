type ExpoGLContextPatch = {
  UNPACK_COLORSPACE_CONVERSION_WEBGL?: number;
  UNPACK_FLIP_Y_WEBGL?: number;
  UNPACK_PREMULTIPLY_ALPHA_WEBGL?: number;
  __VISIOBAL_NATIVE_GL_PATCHED__?: boolean;
  getExtension?: (name: string) => unknown;
  pixelStorei?: (pname: number, param: number | boolean) => void;
};

type ThreeNativeRendererState = {
  gl?: {
    getContext?: () => ExpoGLContextPatch | null;
  };
};

const createNoopLoseContextExtension = () => ({
  loseContext: () => {},
  restoreContext: () => {},
});

export function configureThreeNativeRenderer({ gl }: ThreeNativeRendererState) {
  const context = gl?.getContext?.();

  if (!context || context.__VISIOBAL_NATIVE_GL_PATCHED__) {
    return;
  }

  context.__VISIOBAL_NATIVE_GL_PATCHED__ = true;

  const unsupportedPixelStoreiParams = new Set(
    [
      context.UNPACK_COLORSPACE_CONVERSION_WEBGL,
      context.UNPACK_FLIP_Y_WEBGL,
      context.UNPACK_PREMULTIPLY_ALPHA_WEBGL,
    ].filter((value): value is number => typeof value === 'number')
  );

  const originalPixelStorei = context.pixelStorei?.bind(context);

  if (originalPixelStorei) {
    context.pixelStorei = (pname, param) => {
      if (unsupportedPixelStoreiParams.has(pname)) {
        return;
      }

      originalPixelStorei(pname, param);
    };
  }

  const originalGetExtension = context.getExtension?.bind(context);

  if (originalGetExtension) {
    context.getExtension = (name) => {
      if (name === 'WEBGL_lose_context') {
        return createNoopLoseContextExtension();
      }

      return originalGetExtension(name);
    };
  }
}