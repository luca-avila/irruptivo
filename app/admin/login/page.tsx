import { LogIn, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { loginAdmin } from "../../../src/admin/actions";
import { getCurrentAdmin } from "../../../src/admin/auth";
import styles from "./login.module.css";

type AdminLoginPageProps = {
  searchParams?: Promise<{
    error?: string | string[];
    estado?: string | string[];
  }>;
};

type LoginFeedback = {
  tone: "error" | "info";
  title: string;
  message: string;
};

const LOGIN_FEEDBACK = {
  validacion: {
    tone: "error",
    title: "Faltan datos",
    message: "Completá usuario y contraseña para continuar."
  },
  credenciales: {
    tone: "error",
    title: "No pudimos ingresar",
    message: "Revisá usuario y contraseña e intentá de nuevo."
  },
  configuracion: {
    tone: "error",
    title: "Acceso no disponible",
    message: "El ingreso administrativo no está configurado en este entorno."
  },
  requerido: {
    tone: "info",
    title: "Acceso protegido",
    message: "Iniciá sesión para entrar al panel administrativo."
  },
  "sesion-vencida": {
    tone: "info",
    title: "Sesión vencida",
    message: "Volvé a ingresar para continuar."
  },
  "sesion-cerrada": {
    tone: "info",
    title: "Sesión cerrada",
    message: "Tu sesión administrativa se cerró correctamente."
  }
} as const satisfies Record<string, LoginFeedback>;

type LoginFeedbackKey = keyof typeof LOGIN_FEEDBACK;

export default async function AdminLoginPage({
  searchParams
}: AdminLoginPageProps) {
  const admin = await getCurrentAdmin();

  if (admin) {
    redirect("/admin");
  }

  const params = (await searchParams) ?? {};
  const feedback = getLoginFeedback(params);

  return (
    <div className={styles.page}>
      <section className={styles.panel} aria-labelledby="admin-login-title">
        <div className={styles.brand}>
          <span className={styles.brandIcon}>
            <ShieldCheck aria-hidden="true" size={20} strokeWidth={2.1} />
          </span>
          <span>IRRUPTIVO GESTIÓN</span>
        </div>

        <p className={styles.eyebrow}>Acceso privado</p>
        <h1 className={styles.title} id="admin-login-title">
          Ingresar al panel
        </h1>
        <p className={styles.copy}>
          Usá tus credenciales administrativas para gestionar la tienda.
        </p>

        {feedback ? (
          <div
            className={
              feedback.tone === "error"
                ? `${styles.feedback} ${styles.feedbackError}`
                : styles.feedback
            }
            role={feedback.tone === "error" ? "alert" : "status"}
          >
            <strong className={styles.feedbackTitle}>{feedback.title}</strong>
            <span className={styles.feedbackMessage}>{feedback.message}</span>
          </div>
        ) : null}

        <form className={styles.form} action={loginAdmin}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="admin-username">
              Usuario administrativo
            </label>
            <input
              className={styles.input}
              id="admin-username"
              name="username"
              type="text"
              autoComplete="username"
              required
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="admin-password">
              Contraseña
            </label>
            <input
              className={styles.input}
              id="admin-password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
          </div>

          <button className={styles.submit} type="submit">
            <span>Ingresar</span>
            <LogIn aria-hidden="true" size={19} strokeWidth={2.1} />
          </button>
        </form>

        <Link className={styles.secondaryLink} href="/">
          Volver a la tienda
        </Link>
      </section>
    </div>
  );
}

function getLoginFeedback(params: {
  error?: string | string[];
  estado?: string | string[];
}): LoginFeedback | null {
  const error = firstParam(params.error);
  const status = firstParam(params.estado);

  if (isLoginFeedbackKey(error)) {
    return LOGIN_FEEDBACK[error];
  }

  if (isLoginFeedbackKey(status)) {
    return LOGIN_FEEDBACK[status];
  }

  return null;
}

function isLoginFeedbackKey(
  value: string | undefined
): value is LoginFeedbackKey {
  return value !== undefined && value in LOGIN_FEEDBACK;
}

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
