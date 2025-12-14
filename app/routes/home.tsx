import Navbar from "~/components/Navbar";
import type { Route } from "./+types/home";
import { resumes } from "../../constants";
import ResumeCard from "~/components/ResumeCard";
import { useEffect } from "react";
import { usePuterStore } from "~/lib/puter";
import { useNavigate } from "react-router";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Resumind" },
    { name: "description", content: "Smart feedback for your dream Job!!" },
  ];
}

export default function Home() {
      //ui trick to save which page was trying to be accessed by an unauthenticated user and then push them back there after auth
    const { auth} = usePuterStore()
    const navigate = useNavigate()

    useEffect(() => {
        if(!auth.isAuthenticated) navigate('/auth?next=/')
    },[auth.isAuthenticated])

  return <main className="bg-[url('/images/bg-main.svg')] bg-cover">
    <Navbar />
    <section className="main-section">
      <div className="page-heading py-16">
        <h1>Track Your Applicaitons & Resume Ratings</h1>
        <h2>Review your submissions and check AI-powered feedback</h2>
      </div>
    
    {resumes.length > 0 && (
      <div className="resumes-section">
      {resumes.map((resume) => (
        <ResumeCard key={resume.id} resume={resume} />
      ))}

    </div>
)}
</section>
  </main>;
}
