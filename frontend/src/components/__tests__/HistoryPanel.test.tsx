import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import HistoryPanel from '../HistoryPanel';

describe('HistoryPanel Component', () => {
  const mockHistory = [
    { id: '1', action: 'Initial State', timestamp: '10:00:00' },
    { id: '2', action: 'Brush Stroke', timestamp: '10:00:15' },
    { id: '3', action: 'Rectangle Added', timestamp: '10:00:30' },
    { id: '4', action: 'Object Modified', timestamp: '10:00:45' },
  ];

  const defaultProps = {
    history: mockHistory,
    historyStep: 3, // Currently at the last item
    onUndo: vi.fn(),
    onRedo: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render history panel with title', () => {
      render(<HistoryPanel {...defaultProps} />);

      expect(screen.getByText('History')).toBeInTheDocument();
    });

    it('should render undo button', () => {
      render(<HistoryPanel {...defaultProps} />);

      const undoButton = screen.getByTitle('Undo');
      expect(undoButton).toBeInTheDocument();
    });

    it('should render redo button', () => {
      render(<HistoryPanel {...defaultProps} />);

      const redoButton = screen.getByTitle('Redo');
      expect(redoButton).toBeInTheDocument();
    });

    it('should render all history items', () => {
      render(<HistoryPanel {...defaultProps} />);

      expect(screen.getByText('Initial State')).toBeInTheDocument();
      expect(screen.getByText('Brush Stroke')).toBeInTheDocument();
      expect(screen.getByText('Rectangle Added')).toBeInTheDocument();
      expect(screen.getByText('Object Modified')).toBeInTheDocument();
    });

    it('should render timestamps for each history item', () => {
      render(<HistoryPanel {...defaultProps} />);

      expect(screen.getByText('10:00:00')).toBeInTheDocument();
      expect(screen.getByText('10:00:15')).toBeInTheDocument();
      expect(screen.getByText('10:00:30')).toBeInTheDocument();
      expect(screen.getByText('10:00:45')).toBeInTheDocument();
    });

    it('should render no history message when history is empty', () => {
      render(<HistoryPanel {...defaultProps} history={[]} historyStep={-1} />);

      expect(screen.getByText('No history yet')).toBeInTheDocument();
    });

    it('should render clock icon in header', () => {
      render(<HistoryPanel {...defaultProps} />);

      const header = screen.getByText('History').parentElement;
      expect(header).toBeInTheDocument();
    });
  });

  describe('Undo Button', () => {
    it('should call onUndo when undo button is clicked', () => {
      render(<HistoryPanel {...defaultProps} />);

      const undoButton = screen.getByTitle('Undo');
      fireEvent.click(undoButton);

      expect(defaultProps.onUndo).toHaveBeenCalledTimes(1);
    });

    it('should be enabled when historyStep is greater than or equal to 0', () => {
      render(<HistoryPanel {...defaultProps} historyStep={2} />);

      const undoButton = screen.getByTitle('Undo');
      expect(undoButton).not.toBeDisabled();
    });

    it('should be disabled when historyStep is less than 0', () => {
      render(<HistoryPanel {...defaultProps} historyStep={-1} />);

      const undoButton = screen.getByTitle('Undo');
      expect(undoButton).toBeDisabled();
    });

    it('should be disabled at the beginning of history', () => {
      render(<HistoryPanel {...defaultProps} historyStep={-1} />);

      const undoButton = screen.getByTitle('Undo');
      expect(undoButton).toBeDisabled();
    });

    it('should remain enabled when at first history item', () => {
      render(<HistoryPanel {...defaultProps} historyStep={0} />);

      const undoButton = screen.getByTitle('Undo');
      expect(undoButton).not.toBeDisabled();
    });
  });

  describe('Redo Button', () => {
    it('should call onRedo when redo button is clicked', () => {
      render(<HistoryPanel {...defaultProps} historyStep={2} />);

      const redoButton = screen.getByTitle('Redo');
      fireEvent.click(redoButton);

      expect(defaultProps.onRedo).toHaveBeenCalledTimes(1);
    });

    it('should be enabled when historyStep is less than history.length - 1', () => {
      render(<HistoryPanel {...defaultProps} historyStep={2} />);

      const redoButton = screen.getByTitle('Redo');
      expect(redoButton).not.toBeDisabled();
    });

    it('should be disabled when historyStep equals history.length - 1', () => {
      render(<HistoryPanel {...defaultProps} historyStep={3} />);

      const redoButton = screen.getByTitle('Redo');
      expect(redoButton).toBeDisabled();
    });

    it('should be disabled when at the end of history', () => {
      render(<HistoryPanel {...defaultProps} historyStep={3} />);

      const redoButton = screen.getByTitle('Redo');
      expect(redoButton).toBeDisabled();
    });

    it('should be enabled when there are future states', () => {
      render(<HistoryPanel {...defaultProps} historyStep={1} />);

      const redoButton = screen.getByTitle('Redo');
      expect(redoButton).not.toBeDisabled();
    });
  });

  describe('History Item Styling', () => {
    it('should highlight current history step', () => {
      render(<HistoryPanel {...defaultProps} historyStep={2} />);

      const historyItems = screen.getAllByText(/State|Stroke|Added|Modified/);
      const currentItem = historyItems[2].closest('div')?.parentElement;

      expect(currentItem).toHaveClass('bg-[#0d7bdc]');
      expect(currentItem).toHaveClass('text-white');
    });

    it('should style past history items differently', () => {
      render(<HistoryPanel {...defaultProps} historyStep={2} />);

      const historyItems = screen.getAllByText(/State|Stroke|Added|Modified/);
      const pastItem = historyItems[1].closest('div')?.parentElement;

      expect(pastItem).toHaveClass('bg-[#3e3e3e]');
      expect(pastItem).toHaveClass('text-gray-300');
    });

    it('should style future history items differently', () => {
      render(<HistoryPanel {...defaultProps} historyStep={1} />);

      const historyItems = screen.getAllByText(/State|Stroke|Added|Modified/);
      const futureItem = historyItems[2].closest('div')?.parentElement;

      expect(futureItem).toHaveClass('bg-[#2d2d2d]');
      expect(futureItem).toHaveClass('text-gray-500');
    });

    it('should update styling when historyStep changes', () => {
      const { rerender } = render(<HistoryPanel {...defaultProps} historyStep={2} />);

      const historyItems = screen.getAllByText(/State|Stroke|Added|Modified/);
      const item2 = historyItems[2].closest('div')?.parentElement;
      expect(item2).toHaveClass('bg-[#0d7bdc]');

      rerender(<HistoryPanel {...defaultProps} historyStep={1} />);

      const updatedItems = screen.getAllByText(/State|Stroke|Added|Modified/);
      const updatedItem1 = updatedItems[1].closest('div')?.parentElement;
      const updatedItem2 = updatedItems[2].closest('div')?.parentElement;

      expect(updatedItem1).toHaveClass('bg-[#0d7bdc]');
      expect(updatedItem2).toHaveClass('bg-[#2d2d2d]');
    });
  });

  describe('History Item Content', () => {
    it('should display action text for each history item', () => {
      render(<HistoryPanel {...defaultProps} />);

      mockHistory.forEach((item) => {
        expect(screen.getByText(item.action)).toBeInTheDocument();
      });
    });

    it('should display timestamp text for each history item', () => {
      render(<HistoryPanel {...defaultProps} />);

      mockHistory.forEach((item) => {
        expect(screen.getByText(item.timestamp)).toBeInTheDocument();
      });
    });

    it('should render action in font-medium style', () => {
      render(<HistoryPanel {...defaultProps} />);

      const actionElement = screen.getByText('Brush Stroke');
      expect(actionElement).toHaveClass('font-medium');
    });

    it('should render timestamp in smaller text with opacity', () => {
      render(<HistoryPanel {...defaultProps} />);

      const timestampElement = screen.getByText('10:00:15');
      expect(timestampElement).toHaveClass('text-xs');
      expect(timestampElement).toHaveClass('opacity-70');
    });
  });

  describe('Scrolling Behavior', () => {
    it('should render history items in a scrollable area', () => {
      render(<HistoryPanel {...defaultProps} />);

      // ScrollArea component should be present
      const historyItems = screen.getByText('Initial State').closest('div')?.parentElement?.parentElement;
      expect(historyItems).toBeInTheDocument();
    });

    it('should handle long history lists', () => {
      const longHistory = Array.from({ length: 50 }, (_, i) => ({
        id: `${i}`,
        action: `Action ${i}`,
        timestamp: `10:${String(i).padStart(2, '0')}:00`,
      }));

      render(<HistoryPanel {...defaultProps} history={longHistory} historyStep={25} />);

      expect(screen.getByText('Action 0')).toBeInTheDocument();
      expect(screen.getByText('Action 49')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle single history item', () => {
      const singleHistory = [{ id: '1', action: 'Initial State', timestamp: '10:00:00' }];

      render(<HistoryPanel {...defaultProps} history={singleHistory} historyStep={0} />);

      expect(screen.getByText('Initial State')).toBeInTheDocument();

      const undoButton = screen.getByTitle('Undo');
      const redoButton = screen.getByTitle('Redo');

      expect(undoButton).not.toBeDisabled();
      expect(redoButton).toBeDisabled();
    });

    it('should handle historyStep at -1 (no selection)', () => {
      render(<HistoryPanel {...defaultProps} historyStep={-1} />);

      const undoButton = screen.getByTitle('Undo');
      expect(undoButton).toBeDisabled();

      const redoButton = screen.getByTitle('Redo');
      expect(redoButton).not.toBeDisabled();
    });

    it('should handle historyStep beyond history length', () => {
      render(<HistoryPanel {...defaultProps} historyStep={100} />);

      const redoButton = screen.getByTitle('Redo');
      expect(redoButton).toBeDisabled();
    });

    it('should handle empty history array', () => {
      render(<HistoryPanel {...defaultProps} history={[]} historyStep={-1} />);

      expect(screen.getByText('No history yet')).toBeInTheDocument();

      const undoButton = screen.getByTitle('Undo');
      const redoButton = screen.getByTitle('Redo');

      expect(undoButton).toBeDisabled();
      expect(redoButton).toBeDisabled();
    });

    it('should handle history with identical timestamps', () => {
      const historyWithSameTime = [
        { id: '1', action: 'Action 1', timestamp: '10:00:00' },
        { id: '2', action: 'Action 2', timestamp: '10:00:00' },
        { id: '3', action: 'Action 3', timestamp: '10:00:00' },
      ];

      render(<HistoryPanel {...defaultProps} history={historyWithSameTime} historyStep={1} />);

      const timestamps = screen.getAllByText('10:00:00');
      expect(timestamps).toHaveLength(3);
    });

    it('should handle very long action names', () => {
      const longActionHistory = [
        {
          id: '1',
          action: 'This is a very long action name that might cause layout issues if not handled properly',
          timestamp: '10:00:00',
        },
      ];

      render(<HistoryPanel {...defaultProps} history={longActionHistory} historyStep={0} />);

      expect(
        screen.getByText('This is a very long action name that might cause layout issues if not handled properly')
      ).toBeInTheDocument();
    });
  });

  describe('Integration with Parent Component', () => {
    it('should update when history prop changes', () => {
      const { rerender } = render(<HistoryPanel {...defaultProps} />);

      expect(screen.getByText('Initial State')).toBeInTheDocument();
      expect(screen.queryByText('New Action')).not.toBeInTheDocument();

      const newHistory = [
        ...mockHistory,
        { id: '5', action: 'New Action', timestamp: '10:01:00' },
      ];

      rerender(<HistoryPanel {...defaultProps} history={newHistory} historyStep={4} />);

      expect(screen.getByText('New Action')).toBeInTheDocument();
    });

    it('should update when historyStep prop changes', () => {
      const { rerender } = render(<HistoryPanel {...defaultProps} historyStep={2} />);

      const historyItems = screen.getAllByText(/State|Stroke|Added|Modified/);
      const item2 = historyItems[2].closest('div')?.parentElement;
      expect(item2).toHaveClass('bg-[#0d7bdc]');

      rerender(<HistoryPanel {...defaultProps} historyStep={1} />);

      const updatedItems = screen.getAllByText(/State|Stroke|Added|Modified/);
      const updatedItem1 = updatedItems[1].closest('div')?.parentElement;
      expect(updatedItem1).toHaveClass('bg-[#0d7bdc]');
    });

    it('should call onUndo when undo button clicked multiple times', () => {
      render(<HistoryPanel {...defaultProps} historyStep={3} />);

      const undoButton = screen.getByTitle('Undo');

      fireEvent.click(undoButton);
      fireEvent.click(undoButton);
      fireEvent.click(undoButton);

      expect(defaultProps.onUndo).toHaveBeenCalledTimes(3);
    });

    it('should call onRedo when redo button clicked multiple times', () => {
      render(<HistoryPanel {...defaultProps} historyStep={0} />);

      const redoButton = screen.getByTitle('Redo');

      fireEvent.click(redoButton);
      fireEvent.click(redoButton);
      fireEvent.click(redoButton);

      expect(defaultProps.onRedo).toHaveBeenCalledTimes(3);
    });
  });

  describe('Button Interactions', () => {
    it('should not call onUndo when undo button is disabled', () => {
      render(<HistoryPanel {...defaultProps} historyStep={-1} />);

      const undoButton = screen.getByTitle('Undo');
      expect(undoButton).toBeDisabled();

      fireEvent.click(undoButton);

      expect(defaultProps.onUndo).not.toHaveBeenCalled();
    });

    it('should not call onRedo when redo button is disabled', () => {
      render(<HistoryPanel {...defaultProps} historyStep={3} />);

      const redoButton = screen.getByTitle('Redo');
      expect(redoButton).toBeDisabled();

      fireEvent.click(redoButton);

      expect(defaultProps.onRedo).not.toHaveBeenCalled();
    });

    it('should have correct button styling for enabled state', () => {
      render(<HistoryPanel {...defaultProps} historyStep={2} />);

      const undoButton = screen.getByTitle('Undo');
      const redoButton = screen.getByTitle('Redo');

      expect(undoButton).toHaveClass('hover:bg-[#3e3e3e]');
      expect(redoButton).toHaveClass('hover:bg-[#3e3e3e]');
    });

    it('should have consistent button sizes', () => {
      render(<HistoryPanel {...defaultProps} />);

      const undoButton = screen.getByTitle('Undo');
      const redoButton = screen.getByTitle('Redo');

      expect(undoButton).toHaveClass('h-8');
      expect(undoButton).toHaveClass('w-8');
      expect(redoButton).toHaveClass('h-8');
      expect(redoButton).toHaveClass('w-8');
    });
  });

  describe('Visual Feedback', () => {
    it('should show transition effects on history items', () => {
      render(<HistoryPanel {...defaultProps} />);

      const historyItems = screen.getAllByText(/State|Stroke|Added|Modified/);
      historyItems.forEach((item) => {
        const container = item.closest('div')?.parentElement;
        expect(container).toHaveClass('transition-colors');
      });
    });

    it('should apply rounded corners to history items', () => {
      render(<HistoryPanel {...defaultProps} />);

      const historyItems = screen.getAllByText(/State|Stroke|Added|Modified/);
      historyItems.forEach((item) => {
        const container = item.closest('div')?.parentElement;
        expect(container).toHaveClass('rounded');
      });
    });

    it('should apply padding to history items', () => {
      render(<HistoryPanel {...defaultProps} />);

      const historyItems = screen.getAllByText(/State|Stroke|Added|Modified/);
      historyItems.forEach((item) => {
        const container = item.closest('div')?.parentElement;
        expect(container).toHaveClass('px-3');
        expect(container).toHaveClass('py-2');
      });
    });
  });

  describe('Accessibility', () => {
    it('should have title attributes for buttons', () => {
      render(<HistoryPanel {...defaultProps} />);

      expect(screen.getByTitle('Undo')).toBeInTheDocument();
      expect(screen.getByTitle('Redo')).toBeInTheDocument();
    });

    it('should properly disable buttons when appropriate', () => {
      render(<HistoryPanel {...defaultProps} historyStep={-1} />);

      const undoButton = screen.getByTitle('Undo');
      expect(undoButton).toHaveAttribute('disabled');
    });

    it('should have semantic heading for panel title', () => {
      render(<HistoryPanel {...defaultProps} />);

      const heading = screen.getByText('History');
      expect(heading).toHaveClass('font-semibold');
    });
  });

  describe('Performance', () => {
    it('should efficiently render large history lists', () => {
      const largeHistory = Array.from({ length: 1000 }, (_, i) => ({
        id: `${i}`,
        action: `Action ${i}`,
        timestamp: `10:${String(i % 60).padStart(2, '0')}:00`,
      }));

      const { container } = render(
        <HistoryPanel {...defaultProps} history={largeHistory} historyStep={500} />
      );

      // Should render without crashing
      expect(container).toBeInTheDocument();
    });
  });

  describe('History State Transitions', () => {
    it('should correctly transition from middle to beginning of history', () => {
      const { rerender } = render(<HistoryPanel {...defaultProps} historyStep={2} />);

      const undoButton = screen.getByTitle('Undo');
      expect(undoButton).not.toBeDisabled();

      rerender(<HistoryPanel {...defaultProps} historyStep={-1} />);

      expect(undoButton).toBeDisabled();
    });

    it('should correctly transition from middle to end of history', () => {
      const { rerender } = render(<HistoryPanel {...defaultProps} historyStep={2} />);

      const redoButton = screen.getByTitle('Redo');
      expect(redoButton).not.toBeDisabled();

      rerender(<HistoryPanel {...defaultProps} historyStep={3} />);

      expect(redoButton).toBeDisabled();
    });

    it('should update all visual states when history changes', () => {
      const { rerender } = render(<HistoryPanel {...defaultProps} historyStep={1} />);

      const historyItems = screen.getAllByText(/State|Stroke|Added|Modified/);
      const currentItem = historyItems[1].closest('div')?.parentElement;
      const futureItem = historyItems[2].closest('div')?.parentElement;

      expect(currentItem).toHaveClass('bg-[#0d7bdc]');
      expect(futureItem).toHaveClass('bg-[#2d2d2d]');

      rerender(<HistoryPanel {...defaultProps} historyStep={2} />);

      const updatedItems = screen.getAllByText(/State|Stroke|Added|Modified/);
      const newCurrentItem = updatedItems[2].closest('div')?.parentElement;
      const newPastItem = updatedItems[1].closest('div')?.parentElement;

      expect(newCurrentItem).toHaveClass('bg-[#0d7bdc]');
      expect(newPastItem).toHaveClass('bg-[#3e3e3e]');
    });
  });
});
