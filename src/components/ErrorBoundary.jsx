import { Component } from 'react';
import { RotateCw, TriangleAlert } from 'lucide-react';
import EmptyState from './EmptyState.jsx';
import { ERRORS } from '../labels.js';

// Fehlerzustand für jeden Bildschirm: Statt einer leeren Seite erscheint eine ruhige Meldung
// mit einem Knopf zum Neuladen.
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error) {
    console.error(error);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <main className="screen screen-error">
        <EmptyState icon={TriangleAlert} title={ERRORS.title} text={this.props.text ?? ERRORS.text}>
          <button type="button" className="button-primary" onClick={() => window.location.reload()}>
            <RotateCw aria-hidden="true" />
            {ERRORS.reload}
          </button>
        </EmptyState>
      </main>
    );
  }
}
