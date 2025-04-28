import RegisterForm from "@/components/auth/RegisterForm";

export default function RegisterPage() {
  return (
    <div className="max-w-5xl mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8 text-center text-primary-800 dark:text-primary-400">
        Create an Account
      </h1>
      <RegisterForm />
    </div>
  );
}
