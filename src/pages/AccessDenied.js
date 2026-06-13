import { Link } from 'react-router-dom';

function AccessDenied() {
  return (
    <main className="page">
      <section className="card">
        <h1>Доступ запрещён</h1>
        <p>У вас недостаточно прав для просмотра этой страницы.</p>
        <Link className="button" to="/">
          Вернуться на главную
        </Link>
      </section>
    </main>
  );
}

export default AccessDenied;