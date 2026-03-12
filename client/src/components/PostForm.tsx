import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { FiUploadCloud, FiX } from "react-icons/fi";
import { uploadFile, resolveMediaUrl } from "../services/fileService";
import postService from "../services/postService";
import type { IPost } from "../types";

// ── Schema ────────────────────────────────────────────────────────────────────

const schema = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title is too long"),
  content: z
    .string()
    .min(1, "Content is required")
    .max(5000, "Content is too long"),
});

type FormValues = z.infer<typeof schema>;

// ── Props ─────────────────────────────────────────────────────────────────────

interface PostFormProps {
  /** Pass an existing post to switch the form into "edit" mode */
  initialPost?: IPost;
  onSuccess: (post: IPost) => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function PostForm({ initialPost, onSuccess }: PostFormProps) {
  const isEdit = !!initialPost;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: initialPost?.title ?? "",
      content: initialPost?.content ?? "",
    },
  });

  // Image state — separate from RHF because it's a File, not a plain value
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(
    initialPost?.image ? resolveMediaUrl(initialPost.image) ?? null : null,
  );
  const [imageError, setImageError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setImageError("Please select an image file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setImageError("Image must be smaller than 5 MB.");
      return;
    }

    setImageError(null);
    setImageFile(file);
    setPreview(URL.createObjectURL(file));
  };

  const clearImage = () => {
    setImageFile(null);
    setPreview(isEdit ? (resolveMediaUrl(initialPost?.image) ?? null) : null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const onSubmit = async (values: FormValues) => {
    setSubmitError(null);

    // Validate: create mode needs an image
    if (!isEdit && !imageFile) {
      setImageError("A cover image is required.");
      return;
    }

    try {
      let imageUrl = initialPost?.image;

      if (imageFile) {
        imageUrl = await uploadFile(imageFile);
      }

      const post = isEdit
        ? await postService.updatePost(initialPost!._id, {
            ...values,
            image: imageUrl,
          })
        : await postService.createPost({ ...values, image: imageUrl });

      onSuccess(post);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Something went wrong.";
      setSubmitError(msg);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      {/* Title */}
      <div className="mb-3">
        <label htmlFor="title" className="form-label fw-semibold">
          Title
        </label>
        <input
          id="title"
          type="text"
          placeholder="Where did you travel?"
          className={`form-control ${errors.title ? "is-invalid" : ""}`}
          {...register("title")}
        />
        {errors.title && (
          <div className="invalid-feedback">{errors.title.message}</div>
        )}
      </div>

      {/* Content */}
      <div className="mb-3">
        <label htmlFor="content" className="form-label fw-semibold">
          Your Story
        </label>
        <textarea
          id="content"
          rows={6}
          placeholder="Share your travel experience…"
          className={`form-control ${errors.content ? "is-invalid" : ""}`}
          {...register("content")}
        />
        {errors.content && (
          <div className="invalid-feedback">{errors.content.message}</div>
        )}
      </div>

      {/* Image upload */}
      <div className="mb-4">
        <label className="form-label fw-semibold">
          Cover Image {!isEdit && <span className="text-danger">*</span>}
        </label>

        {preview ? (
          <div className="position-relative d-inline-block w-100">
            <img
              src={preview}
              alt="Preview"
              className="img-fluid rounded"
              style={{ maxHeight: 320, width: "100%", objectFit: "cover" }}
            />
            <button
              type="button"
              className="btn btn-sm btn-dark position-absolute top-0 end-0 m-2 rounded-circle d-flex align-items-center justify-content-center"
              style={{ width: 32, height: 32 }}
              onClick={clearImage}
              aria-label="Remove image"
            >
              <FiX />
            </button>
          </div>
        ) : (
          <div
            className="border border-2 border-dashed rounded d-flex flex-column align-items-center justify-content-center py-5 text-muted"
            style={{ cursor: "pointer", borderStyle: "dashed" }}
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={(e) =>
              e.key === "Enter" && fileInputRef.current?.click()
            }
            role="button"
            tabIndex={0}
          >
            <FiUploadCloud size={36} className="mb-2" />
            <span className="small">Click to upload a photo (max 5 MB)</span>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="d-none"
          onChange={handleFileChange}
        />

        {imageError && (
          <div className="text-danger small mt-1">{imageError}</div>
        )}

        {/* Allow replacing image even when preview exists */}
        {preview && (
          <button
            type="button"
            className="btn btn-outline-secondary btn-sm mt-2"
            onClick={() => fileInputRef.current?.click()}
          >
            Replace image
          </button>
        )}
      </div>

      {/* Server error */}
      {submitError && (
        <div className="alert alert-danger py-2">{submitError}</div>
      )}

      {/* Submit */}
      <div className="d-flex gap-2">
        <button
          type="submit"
          className="btn btn-primary px-4"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <span className="spinner-border spinner-border-sm me-2" />
              {isEdit ? "Saving…" : "Publishing…"}
            </>
          ) : isEdit ? (
            "Save Changes"
          ) : (
            "Publish Post"
          )}
        </button>
        <button
          type="button"
          className="btn btn-outline-secondary"
          onClick={() => window.history.back()}
          disabled={isSubmitting}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
