import { BooksComponent } from './books.component';
import {BookQueryParams} from 'src/app/core/models/bookQueryParams';
import { booksPage } from 'src/app/core/models/booksPage.enum';
import { Component } from '@angular/core';

@Component({
  selector: 'app-read-books',
  templateUrl: './books.component.html',
  styleUrls: ['./books.component.scss']
})

export class ReadBooksComponent extends BooksComponent {

    booksPage = booksPage.Read;

    public getBooks(params: BookQueryParams): void {
        this.bookService.getReadBooks(params)
          .subscribe( {
            next: pageData => {
              this.books = pageData.page;
              for (let i = 0; i < pageData.page.length; i++) {
                this.getWhichBooksWished(pageData.page[i]);
                this.getUserWhoRequested(pageData.page[i], i);
              }
              if (pageData.totalCount) {
                this.totalSize = pageData.totalCount;
              }
            },
            error: error => {
              this.notificationService.error(this.translate
              .instant('Something went wrong!'), 'X');
            }
          });
      }
}
