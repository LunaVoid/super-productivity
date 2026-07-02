import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DialogDeleteGoalComponent } from './dialog-delete-goal.component';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { Goal, MissedWeekBehavior } from '../goal.model';
import { By } from '@angular/platform-browser';

const makeGoal = (id: string, parentGoalId?: string): Goal => ({
  id,
  title: `Goal ${id}`,
  horizon: 'YEARLY',
  parentGoalId,
  linkedTaskIds: [],
  missedWeekBehavior: 'FORGIVE' as MissedWeekBehavior,
  created: 0,
});

describe('DialogDeleteGoalComponent', () => {
  let fixture: ComponentFixture<DialogDeleteGoalComponent>;
  let component: DialogDeleteGoalComponent;
  let dialogRefSpy: jasmine.SpyObj<MatDialogRef<DialogDeleteGoalComponent>>;

  const root = makeGoal('root');
  const child1 = makeGoal('c1', 'root');
  const allGoals = [root, child1];

  beforeEach(async () => {
    dialogRefSpy = jasmine.createSpyObj('MatDialogRef', ['close']);

    await TestBed.configureTestingModule({
      imports: [DialogDeleteGoalComponent, NoopAnimationsModule],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: { goal: root, allGoals } },
        { provide: MatDialogRef, useValue: dialogRefSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DialogDeleteGoalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('shows the correct affected goal count', () => {
    expect(component.affectedGoals().length).toBe(2); // root + child1
    const content = fixture.nativeElement.textContent as string;
    expect(content).toContain('2 goal(s)');
  });

  it('confirm() closes the dialog with result', () => {
    component.confirm();
    expect(dialogRefSpy.close).toHaveBeenCalledWith({
      mode: 'DELETE_ALL',
      remember: false,
    });
  });

  it('cancel() closes the dialog with null', () => {
    component.cancel();
    expect(dialogRefSpy.close).toHaveBeenCalledWith(null);
  });

  it('clicking Cancel button calls cancel()', () => {
    spyOn(component, 'cancel');
    const btn = fixture.debugElement.query(By.css('button[mat-button]'));
    btn.nativeElement.click();
    expect(component.cancel).toHaveBeenCalled();
  });

  it('clicking confirm button calls confirm()', () => {
    spyOn(component, 'confirm');
    const btn = fixture.debugElement.query(By.css('button[mat-raised-button]'));
    btn.nativeElement.click();
    expect(component.confirm).toHaveBeenCalled();
  });
});
