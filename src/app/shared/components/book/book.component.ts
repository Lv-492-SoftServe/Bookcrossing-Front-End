import { UserService } from '../../../core/services/user/user.service';
import {Component, ComponentFactoryResolver, HostListener, OnInit, ViewChild} from '@angular/core';
import { AuthenticationService } from 'src/app/core/services/authentication/authentication.service';
import { switchMap } from 'rxjs/operators';
import { MatIconModule } from '@angular/material/icon';
import { RequestService } from 'src/app/core/services/request/request.service';
import { BookService } from 'src/app/core/services/book/book.service';
import { ActivatedRoute, Router, GuardsCheckStart } from '@angular/router';
import { bookUrl } from 'src/app/configs/api-endpoint.constants';
import { IBook } from 'src/app/core/models/book';
import { NotificationService } from '../../../core/services/notification/notification.service';
import { TranslateService } from '@ngx-translate/core';
import { IRequest } from 'src/app/core/models/request';
import { bookState } from 'src/app/core/models/bookState.enum';
import { DialogService } from 'src/app/core/services/dialog/dialog.service';
import { RequestQueryParams } from 'src/app/core/models/requestQueryParams';
import { IUserInfo } from 'src/app/core/models/userInfo';
import { environment } from 'src/environments/environment';
import { BookEditFormComponent } from '../book-edit-form/book-edit-form.component';
import { RefDirective } from '../../directives/ref.derictive';
import { IBookPut } from 'src/app/core/models/bookPut';
import { booksPage } from 'src/app/core/models/booksPage.enum';
import { WishListService } from 'src/app/core/services/wishlist/wishlist.service';
import { Observable } from 'rxjs/internal/Observable';
import {CommentComponent} from '../comment/comment.component';

@Component({
  selector: 'app-book',
  templateUrl: './book.component.html',
  styleUrls: ['./book.component.scss'],
  providers: [RequestService, BookService],
})
export class BookComponent implements OnInit {
  @ViewChild(RefDirective, { static: false }) refDir: RefDirective;
  @ViewChild('comment') comment: CommentComponent;

  readonly baseUrl = bookUrl;
  book: IBook;
  bookId: number;
  isRequester: boolean;
  isBookOwner: boolean;
  isWished: boolean;
  readCount: number = null;
  currentOwner: IUserInfo = null;
  userWhoRequested: IUserInfo = null;
  firstOwner: IUserInfo = null;
  imagePath: string;
  disabledButton = false;
  previousBooksPage: booksPage;

  constructor(
    private translate: TranslateService,
    private notificationService: NotificationService,
    private router: Router,
    private routeActive: ActivatedRoute,
    private bookService: BookService,
    private requestService: RequestService,
    private dialogService: DialogService,
    private userService: UserService,
    private authentication: AuthenticationService,
    private resolver: ComponentFactoryResolver,
    private wishListService: WishListService
  ) { }

  public ngOnInit(): void {

    this.routeActive.paramMap.pipe(
      switchMap(params => params.getAll('id'))
    )
      .subscribe(data => this.bookId = +data);

    this.bookService.getBookById(this.bookId).subscribe((value: IBook) => {
      this.book = value;
      this.getOwners(this.book.userId);
      if (value.state !== bookState.available) {
        this.getUserWhoRequested();
      }
      if (this.isAuthenticated()) {
        this.wishListService.isWished(this.book.id).subscribe((isWished: boolean) => {
          if (isWished) {
            this.isWished = true;
          }
        });
      }
      this.imagePath = environment.apiUrl + '/' + this.book.imagePath;
      this.getReadCount(value.id);
    });
    this.previousBooksPage = history.state.booksPage;
  }

  public navigate(): void {
    this.router.navigateByUrl(history.state.previousRoute);
  }

  public isAuthenticated(): boolean {
    return this.authentication.isAuthenticated();
  }

  public isAdmin(): boolean {
    return this.authentication.isAdmin();
  }

  public getOwners(userId: number): void {
    this.userService.getUserById(userId)
      .subscribe((value: IUserInfo) => {
        this.currentOwner = value;
        if (this.isAuthenticated()) {
          this.authentication.getUserId().subscribe((id: number) => {
            if (id === this.currentOwner.id) {
              this.isBookOwner = true;
            }
          },
            err => {
              this.isBookOwner = false;
            });
        }
        if (this.book.state !== bookState.available) {
          const query = new RequestQueryParams();
          query.first = true;
          query.last = false;
          this.requestService.getRequestForBook(this.bookId, query).subscribe((request: IRequest) => {
            this.firstOwner = request.owner;
          }, err => {
            this.firstOwner = value;
          });
        } else {
          this.firstOwner = value;
        }
        if (this.firstOwner === undefined) {
          this.firstOwner = value;
        }
      });
  }

  public getReadCount(bookId: number): void {
    this.requestService.getAllRequestsForBook(this.bookId).subscribe((value: IRequest[]) => {
      let counter = 0;
      value.forEach((item) => {
        if (item.receiveDate) {
          counter++;
        }
      });
      this.readCount = counter;
    },
      err => {
        this.notificationService.error(this.translate
          .instant('Something went wrong (Read by counter)!'), 'X');
      });
  }
  public showEditForm(book: IBook): void {
    const formFactory = this.resolver.resolveComponentFactory(BookEditFormComponent);
    const instance = this.refDir.containerRef.createComponent(formFactory).instance;
    instance.book = book;
    instance.isAdmin = this.isAdmin();
    instance.cancel.subscribe(() => { this.refDir.containerRef.clear(); this.ngOnInit(); });
  }

  public getUserWhoRequested(): void {
    const query = new RequestQueryParams();
    query.first = false;
    query.last = true;
    this.requestService.getRequestForBook(this.bookId, query).subscribe((value: IRequest) => {
      if (this.book.state !== bookState.available) {
        this.userWhoRequested = value.user;
        if (this.isAuthenticated()) {
          this.authentication.getUserId().subscribe((id: number) => {
            if (id === this.userWhoRequested.id) {
              this.isRequester = true;
            }
          },
            err => {
              this.isRequester = false;
            });
        }
      }
    });
  }
  public getFormData(book: IBookPut): FormData {
    const formData = new FormData();
    Object.keys(book).forEach((key, i) => {
      if (book[key]) {
        if (Array.isArray(book[key])) {
          book[key].forEach((_, index) => {
            if (key === 'fieldMasks') {
              formData.append(`${key}[${index}]`, book[key][index]);
            } else {
              formData.append(`${key}[${index}][id]`, book[key][index].id);
            }
          });
        } else {
          formData.append(key, book[key]);
        }
      }
    });
    return formData;
  }
  public async makeAvailable(): Promise<void> {
    this.dialogService
      .openConfirmDialog(
        await this.translate.get('Do you want to share book? The book will be available for request!').toPromise()
      )
      .afterClosed()
      .subscribe(async res => {
        if (res) {
          this.disabledButton = true;
          const book: IBookPut = {
            id: this.book.id,
            fieldMasks: ['State'],
            state: bookState.available,
          };
          const formData = this.getFormData(book);
          this.bookService.putBook(this.bookId, formData).subscribe(() => {
            this.disabledButton = false;
            this.ngOnInit();
            this.notificationService.success(this.translate
              .instant('Your Book`s status changed to available.'), 'X');
          }, err => {
            this.disabledButton = false;
            this.notificationService.error(this.translate
              .instant('Something went wrong!'), 'X');
          });
        }
      });
    this.disabledButton = false;
  }

  public async cancelRequest(): Promise<void> {
    this.dialogService
      .openConfirmDialog(
        await this.translate.get('Do you want to cancel request? Current owner will be notified about your cancelation.').toPromise()
      )
      .afterClosed()
      .subscribe(async res => {
        if (res) {
          this.disabledButton = true;
          const query = new RequestQueryParams();
          query.first = false;
          query.last = true;
          this.requestService.getRequestForBook(this.bookId, query).subscribe((value: IRequest) => {
            this.requestService.deleteRequest(value.id).subscribe(() => {
              this.disabledButton = false;
              this.ngOnInit();
              this.notificationService.success(this.translate
                .instant('Request is cancelled.'), 'X');
            }, err => {
              this.disabledButton = false;
              this.notificationService.error(this.translate
                .instant('Something went wrong!'), 'X');
            });
          });
        }
      });

  }
  public async startReading(): Promise<void> {
    this.dialogService
      .openConfirmDialog(
        await this.translate.get('Do you want to start reading? You will be shown as current owner.').toPromise()
      )
      .afterClosed()
      .subscribe(async res => {
        if (res) {
          this.disabledButton = true;
          const query = new RequestQueryParams();
          query.last = true;
          this.requestService.getRequestForBook(this.bookId, query).subscribe((value: IRequest) => {
            this.requestService.approveReceive(value.id).subscribe(() => {
              this.disabledButton = false;
              this.ngOnInit();
              this.notificationService.success(this.translate
                .instant('Book’s owner has been changed.'), 'X');
              this.Donate();
            }, err => {
              this.disabledButton = false;
              this.notificationService.error(this.translate
                .instant('Something went wrong!'), 'X');
            });
          });
        }
      });
    this.disabledButton = false;
  }

  public async Donate(): Promise<void> {
    this.dialogService
      .openDonateDialog(
        await this.translate.get('\You can donate some money for the project. It\'s optional.').toPromise()
      )
      .afterClosed()
      .subscribe(async res => {
        if (res) {
          window.open('https://openeyes.org.ua/');
        }
      });
  }

  public async requestBook(): Promise<void> {
    const userHasValidLocation: boolean = await this.authentication.validateLocation();
    if (!userHasValidLocation) { return; }
    this.dialogService
      .openConfirmDialog(
        await this.translate.get('Do you want to request this book? Current owner will be notified about your request.').toPromise()
      )
      .afterClosed()
      .subscribe(async res => {
        if (res) {
          this.disabledButton = true;
          this.requestService.requestBook(this.bookId).subscribe((value: IRequest) => {
            this.disabledButton = false;
            this.ngOnInit();
            this.notificationService.success(this.translate
              .instant('Book is successfully requested. Please contact with current owner to receive a book'), 'X');
          }, err => {
            this.disabledButton = false;
            this.notificationService.error(this.translate
              .instant('Something went wrong!'), 'X');
          });
        }
      });
  }

  public onRatingSet($event: number): void {
    console.log($event);
  }

  public changeWishList(book: IBook): void {
      if (this.isWished) {
        this.wishListService.removeFromWishList(book.id).subscribe(
          (data) => { this.isWished = false; },
          (error) => {
            this.notificationService.error(
              this.translate.instant('Something went wrong'),
              'X'
            );
          }
        );
      } else {
        this.wishListService.addToWishList(book.id).subscribe(
        (data) => { this.isWished = true; },
          (error) => {
            this.notificationService.error(
              this.translate.instant('Cannot add own book to the wish list'),
              'X'
            );
          }
        );
      }
  }

  public canLeave(): boolean {
    return this.comment.canLeave();
  }
}
