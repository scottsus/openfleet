import type { PluginInput } from "@opencode-ai/plugin";

const SPINNER_DOTS = ["⣷", "⣯", "⣟", "⡿", "⢿", "⣻", "⣽", "⣾"];

type ToastVariant = "info" | "success" | "warning" | "error";

interface ToastOptions {
  title: string;
  message: string;
  variant: ToastVariant;
  duration: number;
}

/**
 * Shows a static toast notification.
 */
export async function showToast(ctx: PluginInput, options: ToastOptions): Promise<void> {
  await ctx.client.tui.showToast({
    body: {
      title: options.title,
      message: options.message,
      variant: options.variant,
      duration: options.duration,
    },
  });
}

/**
 * Shows an animated toast with spinner until stopped.
 *
 * Returns a function to stop the spinner and optionally show a final toast.
 */
export function showSpinnerToast(
  ctx: PluginInput,
  options: { title: string; message: string; variant?: ToastVariant },
): () => Promise<void> {
  const frameInterval = 150;
  let running = true;

  const animate = async () => {
    let frameIndex = 0;

    while (running) {
      const spinner = SPINNER_DOTS[frameIndex % SPINNER_DOTS.length];
      await ctx.client.tui
        .showToast({
          body: {
            title: `${spinner} ${options.title}`,
            message: options.message,
            variant: options.variant || "info",
            duration: frameInterval + 50,
          },
        })
        .catch(() => {});

      await new Promise((resolve) => setTimeout(resolve, frameInterval));
      frameIndex++;
    }
  };

  animate();

  return async () => {
    running = false;
  };
}

/**
 * Shows spinner toast until promise resolves, then shows completion toast.
 */
export async function showSpinnerUntil<T>(
  ctx: PluginInput,
  promise: Promise<T>,
  options: {
    spinner: { title: string; message: string };
    success: { title: string; message: string };
    error: { title: string; message: string };
  },
): Promise<T> {
  const stopSpinner = showSpinnerToast(ctx, {
    title: options.spinner.title,
    message: options.spinner.message,
    variant: "info",
  });

  try {
    const result = await promise;
    await stopSpinner();
    await showToast(ctx, {
      title: options.success.title,
      message: options.success.message,
      variant: "success",
      duration: 3000,
    });
    return result;
  } catch (error) {
    await stopSpinner();
    await showToast(ctx, {
      title: options.error.title,
      message: options.error.message,
      variant: "error",
      duration: 3000,
    });
    throw error;
  }
}
