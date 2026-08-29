import useStore from '../../../store/useStore';
import QuizStartScreen from '../components/QuizStartScreen';
import QuizPlayground from '../components/QuizPlayground';

export default function QuizPage() {
  const quizCard = useStore((state) => state.quizCard);

  if (!quizCard) {
    return <QuizStartScreen />;
  }

  return <QuizPlayground />;
}
