import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useNavigate } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";
import { useAuth } from "../context/AuthContext";

const schema = z.object({
  email: z
    .string()
    .email("Invalid email address")
    .regex(/^\S+$/, "Email must not contain spaces"),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .max(20, "Password must be at most 20 characters")
    .regex(/^\S+$/, "Password must not contain spaces"),
});

type LoginFormData = z.infer<typeof schema>;

function LoginPage() {
  const { login, googleLogin } = useAuth();
  const navigate = useNavigate();
  const [apiError, setApiError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: LoginFormData) => {
    setApiError(null);
    try {
      await login(data.email, data.password);
      navigate("/");
    } catch (err) {
      setApiError(
        err instanceof Error ? err.message : "Invalid email or password",
      );
    }
  };

  const handleGoogleSuccess = async (credentialResponse: {
    credential?: string;
  }) => {
    setApiError(null);
    try {
      if (!credentialResponse.credential) return;
      await googleLogin(credentialResponse.credential);
      navigate("/");
    } catch {
      setApiError("Google login failed. Please try again.");
    }
  };

  return (
    <div className="container mt-5">
      <div className="row justify-content-center">
        <div className="col-md-6 col-lg-4">
          <div className="card shadow-sm">
            <div className="card-body p-4">
              <h2 className="card-title text-center mb-4">Welcome Back</h2>

              {apiError && (
                <div className="alert alert-danger" role="alert">
                  {apiError}
                </div>
              )}

              <form onSubmit={handleSubmit(onSubmit)} noValidate>
                <div className="mb-3">
                  <label htmlFor="email" className="form-label">
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    className={`form-control ${errors.email ? "is-invalid" : ""}`}
                    {...register("email")}
                  />
                  {errors.email && (
                    <div className="invalid-feedback">
                      {errors.email.message}
                    </div>
                  )}
                </div>

                <div className="mb-3">
                  <label htmlFor="password" className="form-label">
                    Password
                  </label>
                  <input
                    id="password"
                    type="password"
                    className={`form-control ${errors.password ? "is-invalid" : ""}`}
                    {...register("password")}
                  />
                  {errors.password && (
                    <div className="invalid-feedback">
                      {errors.password.message}
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  className="btn btn-primary w-100"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <span
                        className="spinner-border spinner-border-sm me-2"
                        role="status"
                        aria-hidden="true"
                      />
                      Signing in...
                    </>
                  ) : (
                    "Sign In"
                  )}
                </button>
              </form>

              <div className="text-center my-3 text-muted">or</div>

              <div className="d-flex justify-content-center">
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={() =>
                    setApiError("Google login failed. Please try again.")
                  }
                />
              </div>

              <p className="text-center mt-3 mb-0">
                Don't have an account? <Link to="/register">Register</Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
