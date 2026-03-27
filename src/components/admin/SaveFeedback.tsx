type SaveFeedbackProps = {
  success?: string | null;
  error?: string | null;
};

export default function SaveFeedback({
  success,
  error,
}: SaveFeedbackProps) {
  if (error) {
    return (
      <p className="text-sm font-medium text-red-700">
        {error}
      </p>
    );
  }

  if (success) {
    return (
      <p className="text-sm font-medium text-emerald-700">
        {success}
      </p>
    );
  }

  return null;
}