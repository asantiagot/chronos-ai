import { useSession, signIn, signOut } from "next-auth/react";

export default function Home() {
    const { data: session } = useSession();

    return (
        <main className="p-4 font-sans">
            <h1 className="text-2xl font-bold mb-4">Chronos AI</h1>
            {!session ? (
                <button onClick={() => signIn("google")}>Sign in with Google</button>
            ) : (
                <>
                    <p className="mb-2">Signed in as {session.user?.email}</p>
                    <button onClick={() => signOut()}>Sign out</button>
                </>
            )}
        </main>
    );
}
